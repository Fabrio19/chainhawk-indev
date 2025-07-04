require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Import all bridge listeners
const { startBridgeWatcher: startStargateWatcher } = require('./stargate');
const { startBridgeWatcher: startCbridgeWatcher } = require('./cbridge');
const { startBridgeWatcher: startWormholeWatcher } = require('./wormhole');
const { startBridgeWatcher: startSynapseWatcher } = require('./synapse');
const { startBridgeWatcher: startHopWatcher } = require('./hop');
const { startBridgeWatcher: startDebridgeWatcher } = require('./debridge');
const { startBridgeWatcher: startAcrossWatcher } = require('./across');
const { startBridgeWatcher: startOrbiterWatcher } = require('./orbiter');
const { startBridgeWatcher: startXbridgeWatcher } = require('./xbridge');

const prisma = new PrismaClient();

/**
 * Master Bridge Manager
 * Coordinates all bridge listeners across multiple chains and protocols
 */
class BridgeManager {
  constructor() {
    this.bridgeListeners = new Map();
    this.isRunning = false;
    this.eventCallback = null;
    
    // Supported chains and their RPC URLs
    this.chains = {
      ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      bsc: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      polygon: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
      arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      optimism: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      avalanche: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
      fantom: process.env.FANTOM_RPC_URL || "https://rpc.ftm.tools/",
      zksync: process.env.ZKSYNC_RPC_URL || "https://mainnet.era.zksync.io",
      linea: process.env.LINEA_RPC_URL || "https://rpc.linea.build",
      base: process.env.BASE_RPC_URL || "https://mainnet.base.org"
    };
    
    // Bridge configurations
    this.bridges = {
      STARGATE: {
        name: 'Stargate',
        startWatcher: startStargateWatcher,
        supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom']
      },
      CELER_CBRIDGE: {
        name: 'Celer cBridge',
        startWatcher: startCbridgeWatcher,
        supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom']
      },
      WORMHOLE: {
        name: 'Wormhole',
        startWatcher: startWormholeWatcher,
        supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom']
      },
      SYNAPSE: {
        name: 'Synapse',
        startWatcher: startSynapseWatcher,
        supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'avalanche']
      },
      HOP_PROTOCOL: {
        name: 'Hop Protocol',
        startWatcher: startHopWatcher,
        supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism']
      },
      DEBRIDGE: {
        name: 'deBridge',
        startWatcher: startDebridgeWatcher,
        supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom']
      },
      ACROSS_PROTOCOL: {
        name: 'Across Protocol',
        startWatcher: startAcrossWatcher,
        supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism']
      },
      ORBITER_FINANCE: {
        name: 'Orbiter Finance',
        startWatcher: startOrbiterWatcher,
        supportedChains: ['ethereum', 'arbitrum', 'optimism', 'zksync', 'linea', 'base', 'polygon']
      },
      XBRIDGE: {
        name: 'xBridge',
        startWatcher: startXbridgeWatcher,
        supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom']
      }
    };
  }

  /**
   * Initialize the bridge manager
   */
  async initialize() {
    console.log('🚀 Initializing Bridge Manager...');
    console.log('==========================================');
    
    try {
      // Test database connection
      await prisma.$connect();
      console.log('✅ Database connection established');
      
      console.log('✅ Bridge Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Bridge Manager:', error.message);
      return false;
    }
  }

  /**
   * Start monitoring all bridges
   */
  async startAllBridges(onEventCallback = null) {
    if (this.isRunning) {
      console.log('⚠️ Bridge monitoring is already running');
      return;
    }

    console.log('🔗 Starting all bridge monitors...');
    console.log('==========================================');

    this.eventCallback = onEventCallback || this.defaultEventCallback.bind(this);
    this.isRunning = true;

    const startPromises = [];

    // Loop through all bridges and their supported chains
    for (const [bridgeKey, bridgeConfig] of Object.entries(this.bridges)) {
      for (const chainName of bridgeConfig.supportedChains) {
        const rpcUrl = this.chains[chainName];
        
        if (!rpcUrl) {
          console.log(`⚠️ No RPC URL configured for ${chainName}, skipping ${bridgeConfig.name}`);
          continue;
        }

        const listenerKey = `${bridgeKey}_${chainName}`;
        
        try {
          console.log(`🔗 Starting ${bridgeConfig.name} on ${chainName}...`);
          
          const listener = await bridgeConfig.startWatcher(
            chainName, 
            rpcUrl, 
            this.eventCallback
          );
          
          this.bridgeListeners.set(listenerKey, {
            bridge: bridgeKey,
            chain: chainName,
            listener: listener,
            status: 'running'
          });
          
          console.log(`✅ ${bridgeConfig.name} started on ${chainName}`);
        } catch (error) {
          console.error(`❌ Failed to start ${bridgeConfig.name} on ${chainName}:`, error.message);
          
          this.bridgeListeners.set(listenerKey, {
            bridge: bridgeKey,
            chain: chainName,
            listener: null,
            status: 'failed',
            error: error.message
          });
        }
      }
    }

    console.log('==========================================');
    console.log(`✅ Bridge monitoring started for ${this.bridgeListeners.size} bridge-chain combinations`);
    console.log('📊 Monitoring real-time cross-chain bridge events...');
  }

  /**
   * Start specific bridge on specific chain
   */
  async startBridge(bridgeKey, chainName, onEventCallback = null) {
    const bridgeConfig = this.bridges[bridgeKey];
    if (!bridgeConfig) {
      throw new Error(`Unknown bridge: ${bridgeKey}`);
    }

    if (!bridgeConfig.supportedChains.includes(chainName)) {
      throw new Error(`Chain ${chainName} not supported by ${bridgeConfig.name}`);
    }

    const rpcUrl = this.chains[chainName];
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for ${chainName}`);
    }

    const listenerKey = `${bridgeKey}_${chainName}`;
    
    try {
      console.log(`🔗 Starting ${bridgeConfig.name} on ${chainName}...`);
      
      const listener = await bridgeConfig.startWatcher(
        chainName, 
        rpcUrl, 
        onEventCallback || this.eventCallback
      );
      
      this.bridgeListeners.set(listenerKey, {
        bridge: bridgeKey,
        chain: chainName,
        listener: listener,
        status: 'running'
      });
      
      console.log(`✅ ${bridgeConfig.name} started on ${chainName}`);
      return listener;
    } catch (error) {
      console.error(`❌ Failed to start ${bridgeConfig.name} on ${chainName}:`, error.message);
      throw error;
    }
  }

  /**
   * Stop all bridge monitors
   */
  async stopAllBridges() {
    console.log('🛑 Stopping all bridge monitors...');
    
    const stopPromises = [];
    
    for (const [listenerKey, listenerInfo] of this.bridgeListeners) {
      if (listenerInfo.listener && listenerInfo.status === 'running') {
        stopPromises.push(
          listenerInfo.listener.stopMonitoring()
            .then(() => {
              listenerInfo.status = 'stopped';
              console.log(`✅ Stopped ${listenerInfo.bridge} on ${listenerInfo.chain}`);
            })
            .catch(error => {
              console.error(`❌ Error stopping ${listenerInfo.bridge} on ${listenerInfo.chain}:`, error.message);
            })
        );
      }
    }
    
    await Promise.all(stopPromises);
    this.isRunning = false;
    console.log('✅ All bridge monitors stopped');
  }

  /**
   * Stop specific bridge on specific chain
   */
  async stopBridge(bridgeKey, chainName) {
    const listenerKey = `${bridgeKey}_${chainName}`;
    const listenerInfo = this.bridgeListeners.get(listenerKey);
    
    if (!listenerInfo) {
      throw new Error(`Bridge ${bridgeKey} not running on ${chainName}`);
    }
    
    if (listenerInfo.listener && listenerInfo.status === 'running') {
      await listenerInfo.listener.stopMonitoring();
      listenerInfo.status = 'stopped';
      console.log(`✅ Stopped ${bridgeKey} on ${chainName}`);
    }
  }

  /**
   * Get status of all bridge listeners
   */
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      totalListeners: this.bridgeListeners.size,
      runningListeners: 0,
      failedListeners: 0,
      stoppedListeners: 0,
      bridges: {}
    };

    for (const [listenerKey, listenerInfo] of this.bridgeListeners) {
      const { bridge, chain, status: listenerStatus } = listenerInfo;
      
      if (!status.bridges[bridge]) {
        status.bridges[bridge] = {
          name: this.bridges[bridge]?.name || bridge,
          chains: {}
        };
      }
      
      status.bridges[bridge].chains[chain] = {
        status: listenerStatus,
        error: listenerInfo.error
      };
      
      switch (listenerStatus) {
        case 'running':
          status.runningListeners++;
          break;
        case 'failed':
          status.failedListeners++;
          break;
        case 'stopped':
          status.stoppedListeners++;
          break;
      }
    }

    return status;
  }

  /**
   * Default event callback - saves to database
   */
  async defaultEventCallback(bridgeData) {
    try {
      // Save bridge transaction to database
      await prisma.bridgeTransaction.create({
        data: {
          bridgeProtocol: bridgeData.protocol,
          sourceChain: bridgeData.sourceChain,
          destinationChain: bridgeData.destinationChain,
          sourceAddress: bridgeData.sourceAddress,
          destinationAddress: bridgeData.destinationAddress,
          tokenAddress: bridgeData.tokenAddress,
          amount: bridgeData.amount,
          transactionHash: bridgeData.txHash,
          blockNumber: bridgeData.blockNumber,
          eventType: bridgeData.eventType,
          timestamp: new Date(bridgeData.timestamp),
          status: 'PENDING',
          riskScore: 0,
          metadata: bridgeData.metadata
        }
      });

      console.log(`💾 Saved ${bridgeData.protocol} transaction: ${bridgeData.txHash}`);
    } catch (error) {
      console.error('❌ Error saving bridge transaction:', error.message);
    }
  }

  /**
   * Get recent bridge transactions
   */
  async getRecentTransactions(limit = 50) {
    try {
      return await prisma.bridgeTransaction.findMany({
        take: limit,
        orderBy: {
          timestamp: 'desc'
        }
      });
    } catch (error) {
      console.error('❌ Error fetching recent transactions:', error.message);
      return [];
    }
  }

  /**
   * Get transactions by protocol
   */
  async getTransactionsByProtocol(protocol, limit = 50) {
    try {
      return await prisma.bridgeTransaction.findMany({
        where: {
          bridgeProtocol: protocol
        },
        take: limit,
        orderBy: {
          timestamp: 'desc'
        }
      });
    } catch (error) {
      console.error('❌ Error fetching transactions by protocol:', error.message);
      return [];
    }
  }

  /**
   * Get bridge statistics
   */
  async getStatistics() {
    try {
      const stats = await prisma.bridgeTransaction.groupBy({
        by: ['bridgeProtocol', 'status'],
        _count: {
          id: true
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Error fetching bridge statistics:', error.message);
      return [];
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up Bridge Manager...');
    
    await this.stopAllBridges();
    await prisma.$disconnect();
    
    console.log('✅ Bridge Manager cleanup completed');
  }
}

/**
 * Create and start bridge manager instance
 */
async function createBridgeManager() {
  const manager = new BridgeManager();
  await manager.initialize();
  return manager;
}

module.exports = {
  BridgeManager,
  createBridgeManager
}; 