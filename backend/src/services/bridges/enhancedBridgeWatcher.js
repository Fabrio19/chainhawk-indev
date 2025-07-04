require('dotenv').config();
const { ethers } = require("ethers");
const { PrismaClient } = require("@prisma/client");
const { BRIDGE_CONFIGS, BRIDGE_EVENTS } = require("../bridgeConfig");
const { 
  STARGATE_REAL_ABI, 
  WORMHOLE_REAL_ABI, 
  SYNAPSE_REAL_ABI, 
  CELER_REAL_ABI 
} = require("../abis/realBridgeABIs");
const EventDecoder = require("./eventDecoder");
const CrossChainLinker = require("./crossChainLinker");
const RiskScoringEngine = require("./riskScoringEngine");
const ValidatorVerifier = require("./validatorVerifier");
const NotificationService = require('../notificationService');
const CSVExportService = require('../csvExportService');
const LoopDetectionService = require('../loopDetectionService');

const prisma = new PrismaClient();

class EnhancedBridgeWatcher {
  constructor() {
    this.providers = new Map();
    this.contracts = new Map();
    this.eventDecoder = new EventDecoder();
    this.crossChainLinker = new CrossChainLinker();
    this.riskScoringEngine = new RiskScoringEngine();
    this.validatorVerifier = new ValidatorVerifier();
    this.isRunning = false;
    
    // New services
    this.notificationService = new NotificationService();
    this.csvExportService = new CSVExportService();
    this.loopDetectionService = new LoopDetectionService();
    
    // Bridge configurations
    this.bridgeConfigs = {
      stargate: {
        ethereum: {
          address: '0x150f94B4499FBe7E62744Fec71503F574D004B5e',
          events: ['Swap', 'SendMsg', 'ReceiveMsg']
        },
        bsc: {
          address: '0x9aA83081AA06AF7208Dcc7A4cB72C94d057D2cda',
          events: ['Swap', 'SendMsg', 'ReceiveMsg']
        },
        polygon: {
          address: '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd',
          events: ['Swap', 'SendMsg', 'ReceiveMsg']
        }
      },
      wormhole: {
        ethereum: {
          address: '0x3ee18B2214AFF97000D974cf647E7C347E8fa585',
          events: ['LogMessagePublished', 'TransferTokensWithPayload', 'Redeem']
        },
        bsc: {
          address: '0xB6F6D86a8f9879A9c87f643768d9efb38f1D8e94',
          events: ['LogMessagePublished', 'TransferTokensWithPayload', 'Redeem']
        }
      },
      synapse: {
        ethereum: {
          address: '0x2796317b0fF8538F253012862c06787Adfb8cEb6',
          events: ['TokenSwap', 'TokenRedeem', 'TokenDeposit']
        },
        bsc: {
          address: '0x749F37Df06A99D6A8E065dd065f8cF947ca23697',
          events: ['TokenSwap', 'TokenRedeem', 'TokenDeposit']
        }
      },
      celer: {
        ethereum: {
          address: '0x5427FEFA711Eff984124bFBB1AB6fbf5E3DA1820',
          events: ['Send', 'Receive', 'Transfer']
        },
        bsc: {
          address: '0x536d7E53D0aDeB1F20E7c81fea45d02eC8dBD2b8',
          events: ['Send', 'Receive', 'Transfer']
        }
      }
    };
  }

  /**
   * Initialize providers for all supported chains
   */
  async initializeProviders() {
    console.log('🔧 Initializing blockchain providers...');
    
    const rpcUrls = {
      ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      bsc: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      polygon: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
      arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      optimism: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      avalanche: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
      solana: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
    };

    for (const [chain, rpcUrl] of Object.entries(rpcUrls)) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        await provider.getNetwork(); // Test connection
        this.providers.set(chain, provider);
        console.log(`✅ ${chain} provider initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${chain} provider:`, error.message);
      }
    }
  }

  /**
   * Initialize bridge contracts for monitoring
   */
  async initializeContracts() {
    console.log('🔗 Initializing bridge contracts...');
    
    for (const [bridgeName, chains] of Object.entries(this.bridgeConfigs)) {
      for (const [chain, config] of Object.entries(chains)) {
        const provider = this.providers.get(chain);
        if (!provider) continue;

        try {
          const contract = new ethers.Contract(config.address, config.events, provider);
          
          const key = `${bridgeName}_${chain}_${config.address}`;
          this.contracts.set(key, {
            contract,
            bridgeName,
            chain,
            address: config.address,
            provider,
            events: config.events
          });
          
          console.log(`✅ ${bridgeName} contract initialized on ${chain}: ${config.address}`);
        } catch (error) {
          console.error(`❌ Failed to initialize ${bridgeName} on ${chain}:`, error.message);
        }
      }
    }
  }

  /**
   * Get the appropriate ABI for a bridge
   */
  getBridgeABI(bridgeName) {
    switch (bridgeName) {
      case 'STARGATE':
        return STARGATE_REAL_ABI;
      case 'WORMHOLE':
        return WORMHOLE_REAL_ABI;
      case 'SYNAPSE':
        return SYNAPSE_REAL_ABI;
      case 'CELER':
        return CELER_REAL_ABI;
      default:
        throw new Error(`Unknown bridge: ${bridgeName}`);
    }
  }

  /**
   * Start monitoring all bridge contracts
   */
  async startMonitoring() {
    if (this.isRunning) {
      console.log('⚠️ Bridge monitoring is already running');
      return;
    }

    console.log('🚀 Starting Enhanced Bridge Monitoring...');
    console.log('==========================================');

    try {
      await this.initializeProviders();
      await this.initializeContracts();
      
      // Set up event listeners for each contract
      for (const [key, contractInfo] of this.contracts) {
        await this.setupEventListeners(contractInfo);
      }

      this.isRunning = true;
      
      // Start additional services
      await this.startAdditionalServices();
      
      console.log('==========================================');
      console.log('✅ Enhanced bridge monitoring started successfully!');
      console.log('📊 Monitoring real-time cross-chain transfers...');
      console.log('🔍 Risk scoring and AML alerts enabled');
      console.log('📱 Telegram/Discord notifications enabled');
      console.log('📊 Hourly CSV exports enabled');
      console.log('🔄 Loop detection enabled');
      
    } catch (error) {
      console.error('❌ Failed to start bridge monitoring:', error.message);
      throw error;
    }
  }

  /**
   * Start additional monitoring services
   */
  async startAdditionalServices() {
    try {
      // Start hourly CSV export
      await this.csvExportService.startHourlyExport();
      console.log('📊 CSV export service started');

      // Start loop detection
      await this.loopDetectionService.startContinuousDetection(30); // Every 30 minutes
      console.log('🔄 Loop detection service started');

      // Test notification service
      if (process.env.TEST_NOTIFICATIONS === 'true') {
        await this.notificationService.testNotifications();
      }

    } catch (error) {
      console.error('❌ Failed to start additional services:', error.message);
    }
  }

  /**
   * Set up event listeners for a specific bridge contract
   */
  async setupEventListeners(contractInfo) {
    const { contract, bridgeName, chain, address, events } = contractInfo;
    
    console.log(`📡 Setting up listeners for ${bridgeName} on ${chain}...`);
    
    for (const eventName of events) {
      try {
        contract.on(eventName, async (...args) => {
          const event = args[args.length - 1];
          await this.handleBridgeEvent(eventName, args.slice(0, -1), event, contractInfo);
        });
        
        console.log(`  ✅ Listening for ${eventName}`);
      } catch (error) {
        console.error(`  ❌ Failed to set up ${eventName} listener:`, error.message);
      }
    }
  }

  /**
   * Handle bridge events with comprehensive processing
   */
  async handleBridgeEvent(eventName, args, event, contractInfo) {
    try {
      const { bridgeName, chain, address } = contractInfo;
      
      console.log(`📡 ${eventName} on ${bridgeName} (${chain}) [${event.transactionHash}]`);
      
      // Decode event data
      const decodedData = await this.eventDecoder.decodeEvent(eventName, args, bridgeName);
      
      // Extract transaction details
      const txData = {
        bridgeProtocol: bridgeName,
        sourceChain: chain,
        destinationChain: decodedData.destinationChain,
        sourceAddress: decodedData.sourceAddress,
        destinationAddress: decodedData.destinationAddress,
        tokenAddress: decodedData.tokenAddress,
        tokenSymbol: decodedData.tokenSymbol,
        amount: decodedData.amount,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        eventType: eventName,
        timestamp: new Date(),
        metadata: {
          nonce: decodedData.nonce,
          messageId: decodedData.messageId,
          signature: decodedData.signature,
          payload: decodedData.payload,
          gasUsed: event.gasUsed?.toString(),
          gasPrice: event.gasPrice?.toString()
        }
      };

      // Verify validator signatures if required
      if (decodedData.signature && this.requiresSignatureVerification(bridgeName)) {
        const isValid = await this.validatorVerifier.verifySignature(
          bridgeName,
          decodedData.messageId,
          decodedData.signature
        );
        txData.metadata.signatureValid = isValid;
        
        if (!isValid) {
          console.log(`⚠️ Invalid signature detected for ${event.transactionHash}`);
        }
      }

      // Calculate risk score
      const riskAssessment = await this.riskScoringEngine.assessBridgeTransaction(txData);
      txData.riskScore = riskAssessment.score;
      txData.riskFlags = riskAssessment.flags;

      // Save to database
      const savedTx = await this.saveBridgeTransaction(txData);
      
      // Log high-risk events
      if (riskAssessment.score > 0.7) {
        console.log(`🚨 HIGH RISK (${riskAssessment.score}): ${eventName} on ${chain}`);
        console.log(`   Amount: ${decodedData.amount} ${decodedData.tokenSymbol}`);
        console.log(`   Risk Flags: ${riskAssessment.flags.join(', ')}`);
        
        // Send high-risk alert
        await this.notificationService.sendHighRiskAlert(savedTx, riskAssessment.score, riskAssessment.flags);
      }

      // Check for ₹10L threshold
      if (riskAssessment.flags.includes('INR_10L_THRESHOLD')) {
        console.log(`💰 ₹10L+ TRANSACTION DETECTED: ${decodedData.amount} ${decodedData.tokenSymbol}`);
        console.log(`   From: ${decodedData.sourceAddress}`);
        console.log(`   To: ${decodedData.destinationAddress}`);
      }

      // Trigger cross-chain linking
      await this.crossChainLinker.processTransaction(savedTx);
      
    } catch (error) {
      console.error(`❌ Error handling ${eventName} event:`, error.message);
    }
  }

  /**
   * Check if a bridge requires signature verification
   */
  requiresSignatureVerification(bridgeName) {
    const bridgesWithSignatures = ['wormhole', 'stargate'];
    return bridgesWithSignatures.includes(bridgeName.toLowerCase());
  }

  /**
   * Save bridge transaction to database
   */
  async saveBridgeTransaction(txData) {
    try {
      const transaction = await prisma.bridgeTransaction.create({
        data: {
          bridgeProtocol: txData.bridgeProtocol,
          sourceChain: txData.sourceChain,
          destinationChain: txData.destinationChain,
          sourceAddress: txData.sourceAddress,
          destinationAddress: txData.destinationAddress,
          tokenAddress: txData.tokenAddress,
          tokenSymbol: txData.tokenSymbol,
          amount: txData.amount,
          transactionHash: txData.transactionHash,
          blockNumber: txData.blockNumber,
          eventType: txData.eventType,
          timestamp: txData.timestamp,
          riskScore: txData.riskScore,
          riskFlags: txData.riskFlags,
          metadata: txData.metadata,
          status: 'CONFIRMED'
        }
      });

      return transaction;
    } catch (error) {
      console.error('❌ Failed to save bridge transaction:', error.message);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    console.log('🛑 Stopping Enhanced Bridge Monitoring...');
    
    this.isRunning = false;
    
    // Stop additional services
    this.csvExportService.stopHourlyExport();
    
    // Remove all event listeners
    for (const [key, contractInfo] of this.contracts) {
      const { contract, events } = contractInfo;
      for (const eventName of events) {
        contract.removeAllListeners(eventName);
      }
    }
    
    // Close database connection
    await prisma.$disconnect();
    
    console.log('✅ Enhanced Bridge Monitoring stopped');
  }

  /**
   * Get monitoring statistics
   */
  async getStatistics() {
    try {
      const stats = await prisma.bridgeTransaction.groupBy({
        by: ['bridgeProtocol', 'status'],
        _count: {
          id: true
        },
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting statistics:', error.message);
      return [];
    }
  }
}

module.exports = EnhancedBridgeWatcher; 
 