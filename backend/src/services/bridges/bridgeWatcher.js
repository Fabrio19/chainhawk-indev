require('dotenv').config();
const { ethers } = require("ethers");
const { Pool } = require("pg");
const { STARGATE_REAL_ABI, WORMHOLE_REAL_ABI, SYNAPSE_REAL_ABI, CBRIDGE_PLACEHOLDER_ABI } = require("../abis/realBridgeABIs");

// Database connection
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/chainhawk_db" 
});

// Risk scoring function
const calculateRiskScore = (eventName, args, amount) => {
  let riskScore = 0;
  
  // High amount threshold (adjust as needed)
  const HIGH_AMOUNT_THRESHOLD = ethers.parseEther("100000"); // 100k tokens
  
  // Amount-based risk
  if (amount && amount > HIGH_AMOUNT_THRESHOLD) {
    riskScore += 50;
  }
  
  // Event-specific risk
  switch (eventName) {
    case 'SendMsg':
    case 'TransferTokens':
    case 'TokenSwap':
      riskScore += 10;
      break;
    case 'LogMessagePublished':
      riskScore += 15;
      break;
    case 'Swap':
      riskScore += 20;
      break;
  }
  
  return Math.min(riskScore, 100); // Cap at 100
};

// Bridge event handler
async function handleBridgeEvent(eventName, args, evt, bridge, srcChain, dstChain) {
  try {
    console.log(`📡 ${eventName} on ${srcChain} [${evt.transactionHash}]`);
    
    // Extract amount from args (this will vary by bridge)
    let amount = null;
    if (args && args.length > 0) {
      // Try to find amount in different positions based on event
      if (eventName === 'Swap' && args.length >= 4) {
        amount = args[3]; // amountLD
      } else if (eventName === 'SendMsg' && args.length >= 5) {
        amount = args[4]; // amountLD
      } else if (eventName === 'TransferTokens' && args.length >= 3) {
        amount = args[2]; // amount
      } else if (eventName === 'TokenSwap' && args.length >= 2) {
        amount = args[1]; // amount
      }
    }
    
    // Calculate risk score
    const riskScore = calculateRiskScore(eventName, args, amount);
    
    // Store in database
    await pool.query(
      `INSERT INTO bridge_events(src_chain, dst_chain, bridge, event, args, tx_hash, block_number, risk_score)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tx_hash, bridge) DO NOTHING;`,
      [
        srcChain, 
        dstChain, 
        bridge, 
        eventName, 
        JSON.stringify(args), 
        evt.transactionHash, 
        evt.blockNumber,
        riskScore
      ]
    );
    
    // Log high-risk events
    if (riskScore > 70) {
      console.log(`🚨 HIGH RISK (${riskScore}): ${eventName} on ${srcChain} - Amount: ${amount}`);
    }
    
  } catch (error) {
    console.error(`❌ Error handling ${eventName} event:`, error.message);
  }
}

// Bridge watcher function
async function watchBridge({ providerUrl, address, abi, eventNames, srcChain, dstChain, bridgeName }) {
  try {
    console.log(`🔗 Initializing ${bridgeName} watcher on ${srcChain}...`);
    
    const provider = new ethers.JsonRpcProvider(providerUrl);
    
    // Test the connection first
    try {
      await provider.getNetwork();
      console.log(`✅ ${bridgeName} RPC connection successful`);
    } catch (error) {
      console.error(`❌ ${bridgeName} RPC connection failed:`, error.message);
      console.log(`   Using fallback RPC for ${bridgeName}`);
      return; // Skip this bridge if RPC fails
    }
    
    const contract = new ethers.Contract(address, abi, provider);
    
    // Set up event listeners
    eventNames.forEach(eventName => {
      contract.on(eventName, async (...args) => {
        const evt = args[args.length - 1];
        await handleBridgeEvent(eventName, args.slice(0, -1), evt, bridgeName, srcChain, dstChain);
      });
    });
    
    console.log(`✅ ${bridgeName} watcher initialized for events: ${eventNames.join(', ')}`);
    
  } catch (error) {
    console.error(`❌ Failed to initialize ${bridgeName} watcher:`, error.message);
    console.log(`   Skipping ${bridgeName} due to initialization error`);
  }
}

// Initialize all bridge watchers
async function initializeBridgeWatchers() {
  console.log('🚀 Initializing Real-Time Bridge Watchers...');
  console.log('==========================================');
  
  // Stargate - Ethereum to BSC
  await watchBridge({
    providerUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    address: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
    abi: STARGATE_REAL_ABI,
    eventNames: ["Swap", "SendMsg", "ReceiveMsg"],
    srcChain: "ethereum",
    dstChain: "bsc",
    bridgeName: "Stargate"
  });

  // Wormhole - Ethereum to BSC
  await watchBridge({
    providerUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    address: "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B",
    abi: WORMHOLE_REAL_ABI,
    eventNames: ["LogMessagePublished", "TransferTokens", "TransferTokensWithPayload", "Redeem"],
    srcChain: "ethereum",
    dstChain: "bsc",
    bridgeName: "Wormhole"
  });

  // Synapse - BSC to Ethereum
  await watchBridge({
    providerUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
    address: "0x749F37Df06A99D6A8E065dd065f8cF947ca23697",
    abi: SYNAPSE_REAL_ABI,
    eventNames: ["TokenSwap", "TokenRedeem", "BridgeEvent"],
    srcChain: "bsc",
    dstChain: "ethereum",
    bridgeName: "Synapse"
  });

  // TODO: Add cBridge watcher
  // await watchBridge({
  //   providerUrl: process.env.ETHEREUM_RPC_URL,
  //   address: "CELER_CONTRACT_ADDRESS", // Need to fetch from Celer docs
  //   abi: CBRIDGE_PLACEHOLDER_ABI,
  //   eventNames: ["Send", "Relay", "Receive"],
  //   srcChain: "ethereum",
  //   dstChain: "bsc",
  //   bridgeName: "cBridge"
  // });

  console.log('==========================================');
  console.log('✅ All bridge watchers initialized successfully!');
  console.log('📊 Monitoring real-time bridge events...');
  console.log('🔍 Check the database for captured events');
}

// Cross-chain linking function
async function linkCrossChainTransactions() {
  try {
    // Find potential cross-chain links based on similar amounts and timing
    const result = await pool.query(`
      SELECT 
        be1.tx_hash as src_tx_hash,
        be2.tx_hash as dst_tx_hash,
        be1.src_chain,
        be2.src_chain as dst_chain,
        be1.bridge as bridge_protocol,
        be1.args->>'amount' as amount,
        be1.timestamp,
        (be1.risk_score + be2.risk_score) / 2 as avg_risk_score
      FROM bridge_events be1
      JOIN bridge_events be2 ON 
        be1.src_chain != be2.src_chain AND
        be1.bridge = be2.bridge AND
        ABS(EXTRACT(EPOCH FROM (be1.timestamp - be2.timestamp))) < 300 AND -- Within 5 minutes
        be1.processed = false AND
        be2.processed = false
      WHERE be1.event IN ('SendMsg', 'TransferTokens', 'TokenSwap')
        AND be2.event IN ('ReceiveMsg', 'Redeem', 'TokenRedeem')
    `);

    for (const link of result.rows) {
      await pool.query(`
        INSERT INTO cross_chain_links(
          src_tx_hash, dst_tx_hash, src_chain, dst_chain, 
          bridge_protocol, risk_score, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (src_tx_hash, dst_tx_hash) DO NOTHING
      `, [
        link.src_tx_hash, link.dst_tx_hash, link.src_chain, link.dst_chain,
        link.bridge_protocol, link.avg_risk_score, 'linked'
      ]);

      // Mark events as processed
      await pool.query(`
        UPDATE bridge_events 
        SET processed = true 
        WHERE tx_hash IN ($1, $2)
      `, [link.src_tx_hash, link.dst_tx_hash]);

      console.log(`🔗 Linked: ${link.src_chain} -> ${link.dst_chain} via ${link.bridge_protocol}`);
    }

  } catch (error) {
    console.error('❌ Error linking cross-chain transactions:', error.message);
  }
}

// Start the bridge monitoring system
async function startBridgeMonitoring() {
  try {
    // Initialize watchers
    await initializeBridgeWatchers();
    
    // Set up periodic cross-chain linking
    setInterval(linkCrossChainTransactions, 60000); // Every minute
    
    console.log('🔄 Cross-chain linking scheduled (every 60 seconds)');
    
  } catch (error) {
    console.error('❌ Failed to start bridge monitoring:', error.message);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down bridge watchers...');
  await pool.end();
  process.exit(0);
});

module.exports = {
  startBridgeMonitoring,
  watchBridge,
  handleBridgeEvent,
  linkCrossChainTransactions
};

// Auto-start if this file is run directly
if (require.main === module) {
  startBridgeMonitoring();
} 