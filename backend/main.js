require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Import all bridge watcher modules
const { startBridgeWatcher: startStargate } = require('./src/services/bridges/stargate');
const { startBridgeWatcher: startCbridge } = require('./src/services/bridges/cbridge');
const { startBridgeWatcher: startWormhole } = require('./src/services/bridges/wormhole');
const { startBridgeWatcher: startSynapse } = require('./src/services/bridges/synapse');
const { startBridgeWatcher: startHop } = require('./src/services/bridges/hop');
const { startBridgeWatcher: startDebridge } = require('./src/services/bridges/debridge');
const { startBridgeWatcher: startAcross } = require('./src/services/bridges/across');
const { startBridgeWatcher: startOrbiter } = require('./src/services/bridges/orbiter');
const { startBridgeWatcher: startXbridge } = require('./src/services/bridges/xbridge');

// Initialize Prisma client
const prisma = new PrismaClient();

// Bridge configuration - which chains to monitor for each protocol
const BRIDGE_CONFIG = {
  STARGATE: {
    chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom'],
    startFunction: startStargate
  },
  CELER_CBRIDGE: {
    chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom'],
    startFunction: startCbridge
  },
  WORMHOLE: {
    chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom', 'solana'],
    startFunction: startWormhole
  },
  SYNAPSE: {
    chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom'],
    startFunction: startSynapse
  },
  HOP: {
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    startFunction: startHop
  },
  DEBRIDGE: {
    chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    startFunction: startDebridge
  },
  ACROSS: {
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    startFunction: startAcross
  },
  ORBITER: {
    chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'zksync', 'linea', 'base'],
    startFunction: startOrbiter
  },
  XBRIDGE: {
    chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    startFunction: startXbridge
  }
};

// RPC URL mapping
const RPC_URLS = {
  ethereum: process.env.ETHEREUM_RPC_URL,
  bsc: process.env.BSC_RPC_URL,
  polygon: process.env.POLYGON_RPC_URL,
  arbitrum: process.env.ARBITRUM_RPC_URL,
  optimism: process.env.OPTIMISM_RPC_URL,
  avalanche: process.env.AVALANCHE_RPC_URL,
  fantom: process.env.FANTOM_RPC_URL,
  zksync: process.env.ZKSYNC_RPC_URL,
  linea: process.env.LINEA_RPC_URL,
  base: process.env.BASE_RPC_URL,
  solana: process.env.SOLANA_RPC_URL
};

// Active bridge listeners
const activeListeners = new Map();

/**
 * Save bridge transaction to database
 */
async function saveBridgeTransaction(bridgeData) {
  try {
    // Map protocol names to enum values
    const protocolMap = {
      'STARGATE': 'STARGATE',
      'CELER_CBRIDGE': 'CELER',
      'WORMHOLE': 'WORMHOLE',
      'SYNAPSE': 'SYNAPSE'
    };

    const protocol = protocolMap[bridgeData.protocol] || 'STARGATE';

    // Get token symbol (you might want to implement token symbol lookup)
    const tokenSymbol = bridgeData.tokenAddress ? 'UNKNOWN' : 'UNKNOWN';

    const transaction = await prisma.bridgeTransaction.create({
      data: {
        bridgeProtocol: protocol,
        sourceChain: bridgeData.sourceChain || 'unknown',
        destinationChain: bridgeData.destinationChain || 'unknown',
        sourceAddress: bridgeData.sourceAddress || '0x0000000000000000000000000000000000000000',
        destinationAddress: bridgeData.destinationAddress || '0x0000000000000000000000000000000000000000',
        tokenAddress: bridgeData.tokenAddress || '0x0000000000000000000000000000000000000000',
        tokenSymbol: tokenSymbol,
        amount: bridgeData.amount || '0',
        transactionHash: bridgeData.txHash,
        blockNumber: bridgeData.blockNumber || 0,
        eventType: bridgeData.eventType || 'UNKNOWN',
        timestamp: new Date(bridgeData.timestamp),
        status: 'PENDING',
        metadata: bridgeData.metadata || {}
      }
    });

    console.log(`💾 Saved bridge transaction: ${transaction.id}`);
    return transaction;
  } catch (error) {
    console.error('❌ Error saving bridge transaction:', error.message);
    throw error;
  }
}

/**
 * Validate bridge signature if available
 */
async function validateBridgeSignature(bridgeData) {
  try {
    // This is a placeholder - implement actual signature validation
    // based on the specific bridge protocol
    console.log(`🔐 Validating signature for ${bridgeData.protocol} transaction: ${bridgeData.txHash}`);
    
    // For now, return true (valid)
    return true;
  } catch (error) {
    console.error('❌ Error validating bridge signature:', error.message);
    return false;
  }
}

/**
 * Event callback for bridge watchers
 */
async function onBridgeEvent(bridgeData) {
  try {
    console.log(`\n🌉 Bridge Event Detected:`);
    console.log(`   Protocol: ${bridgeData.protocol}`);
    console.log(`   TX Hash: ${bridgeData.txHash}`);
    console.log(`   From: ${bridgeData.sourceChain} -> To: ${bridgeData.destinationChain}`);
    console.log(`   Amount: ${bridgeData.amount} tokens`);
    console.log(`   Token: ${bridgeData.tokenAddress}`);
    console.log(`   Wallet: ${bridgeData.sourceAddress || bridgeData.destinationAddress}`);

    // Validate signature if available
    const isValidSignature = await validateBridgeSignature(bridgeData);
    if (!isValidSignature) {
      console.log(`⚠️  Signature validation failed for ${bridgeData.txHash}`);
    }

    // Save to database
    await saveBridgeTransaction(bridgeData);

  } catch (error) {
    console.error('❌ Error processing bridge event:', error.message);
  }
}

/**
 * Check if RPC URLs are configured
 */
function validateRpcConfiguration() {
  const missingRpcs = [];
  const warnings = [];

  for (const [chain, url] of Object.entries(RPC_URLS)) {
    if (!url) {
      missingRpcs.push(chain);
    } else if (!url.startsWith('http')) {
      warnings.push(`${chain}: Invalid RPC URL format`);
    }
  }

  if (missingRpcs.length > 0) {
    console.log(`⚠️  Missing RPC URLs for: ${missingRpcs.join(', ')}`);
    console.log('   Add them to your .env file:');
    missingRpcs.forEach(chain => {
      console.log(`   ${chain.toUpperCase()}_RPC_URL=https://your-rpc-url`);
    });
  }

  if (warnings.length > 0) {
    warnings.forEach(warning => console.log(`⚠️  ${warning}`));
  }

  return missingRpcs.length === 0;
}

/**
 * Start a single bridge watcher
 */
async function startBridgeWatcher(protocol, chain, rpcUrl) {
  try {
    const config = BRIDGE_CONFIG[protocol];
    if (!config) {
      throw new Error(`Unknown protocol: ${protocol}`);
    }

    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for ${chain}`);
    }

    console.log(`🚀 Starting ${protocol} on ${chain}...`);
    
    const listener = await config.startFunction(chain, rpcUrl, onBridgeEvent);
    
    if (listener) {
      const key = `${protocol}_${chain}`;
      activeListeners.set(key, listener);
      console.log(`[✔] ${protocol} on ${chain} started`);
      return true;
    } else {
      console.log(`[✖] ${protocol} on ${chain} failed to start`);
      return false;
    }
  } catch (error) {
    console.log(`[✖] ${protocol} on ${chain} failed: ${error.message}`);
    return false;
  }
}

/**
 * Start all bridge watchers
 */
async function watchAllBridges() {
  console.log('🌉 Starting Bridge Monitoring System...');
  console.log('==========================================\n');

  // Validate RPC configuration
  const rpcValidation = validateRpcConfiguration();
  if (!rpcValidation) {
    console.log('\n⚠️  Some RPC URLs are missing, but continuing with available ones...');
  }

  const startPromises = [];

  // Start all configured bridge watchers
  for (const [protocol, config] of Object.entries(BRIDGE_CONFIG)) {
    for (const chain of config.chains) {
      const rpcUrl = RPC_URLS[chain];
      if (rpcUrl) {
        startPromises.push(startBridgeWatcher(protocol, chain, rpcUrl));
      } else {
        console.log(`⏭️  Skipping ${protocol} on ${chain} (no RPC URL configured)`);
      }
    }
  }

  // Wait for all watchers to start
  const results = await Promise.allSettled(startPromises);
  
  console.log('\n==========================================');
  console.log('📊 Bridge Monitoring Summary:');
  
  let successCount = 0;
  let failureCount = 0;
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      successCount++;
    } else {
      failureCount++;
    }
  });

  console.log(`✅ Successfully started: ${successCount} watchers`);
  console.log(`❌ Failed to start: ${failureCount} watchers`);
  console.log(`🎯 Total active watchers: ${activeListeners.size}`);
  
  if (successCount > 0) {
    console.log('\n🚀 Bridge monitoring system is running!');
    console.log('Press Ctrl+C to stop all watchers.');
  } else {
    console.log('\n❌ No bridge watchers started successfully.');
    console.log('Please configure at least one RPC URL in your .env file.');
    process.exit(1);
  }
}

/**
 * Stop all bridge watchers
 */
async function stopAllBridges() {
  console.log('\n🛑 Stopping all bridge watchers...');
  
  const stopPromises = [];
  
  for (const [key, listener] of activeListeners) {
    if (listener && typeof listener.stopMonitoring === 'function') {
      stopPromises.push(listener.stopMonitoring());
    }
  }
  
  await Promise.allSettled(stopPromises);
  activeListeners.clear();
  
  console.log('✅ All bridge watchers stopped.');
}

/**
 * Get status of all bridge watchers
 */
function getBridgeStatus() {
  const status = [];
  
  for (const [key, listener] of activeListeners) {
    if (listener && typeof listener.getStatus === 'function') {
      status.push(listener.getStatus());
    }
  }
  
  return status;
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await stopAllBridges();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await stopAllBridges();
  await prisma.$disconnect();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the bridge monitoring system
if (require.main === module) {
  watchAllBridges().catch(async (error) => {
    console.error('❌ Failed to start bridge monitoring system:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
}

module.exports = {
  watchAllBridges,
  stopAllBridges,
  getBridgeStatus,
  startBridgeWatcher,
  onBridgeEvent
}; 