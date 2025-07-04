const { PrismaClient } = require("@prisma/client");
const RealBlockchainListener = require("./realBlockchainListener");
const QueueManager = require("./queueManager");
const { BRIDGE_CONFIGS } = require("./bridgeConfig");

const prisma = new PrismaClient();

/**
 * Bridge Monitoring Manager
 * Coordinates all bridge monitors and provides unified interface
 */
class BridgeMonitoringManager {
  constructor() {
    this.realListener = new RealBlockchainListener();
    this.queueManager = new QueueManager();
    this.isMonitoring = false;
    this.monitoringMode = process.env.BRIDGE_MONITORING_MODE || 'REAL'; // MOCK, REAL, HYBRID
  }

  /**
   * Initialize bridge monitoring system
   */
  async initialize() {
    console.log("🚀 Initializing Bridge Monitoring Manager...");
    
    try {
      // Initialize real blockchain listener
      await this.realListener.initialize();
      
      // Initialize queue manager
      await this.queueManager.initialize();
      
      console.log("✅ Bridge Monitoring Manager initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize Bridge Monitoring Manager:", error);
      return false;
    }
  }

  /**
   * Start monitoring all bridge protocols
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log("⚠️ Bridge monitoring is already running");
      return;
    }

    console.log(`🔍 Starting bridge monitoring in ${this.monitoringMode} mode...`);

    try {
      // Start real blockchain monitoring if enabled
      if (this.monitoringMode === 'REAL' || this.monitoringMode === 'HYBRID') {
        await this.startRealMonitoring();
      }

      // Start mock data generation ONLY if explicitly in MOCK or HYBRID mode
      if (this.monitoringMode === 'MOCK' || this.monitoringMode === 'HYBRID') {
        await this.startMockMonitoring();
      }

      // Start queue processing
      await this.queueManager.initialize();

      this.isMonitoring = true;
      console.log("✅ Bridge monitoring started successfully");
    } catch (error) {
      console.error("❌ Failed to start bridge monitoring:", error);
      throw error;
    }
  }

  /**
   * Start real blockchain monitoring
   */
  async startRealMonitoring() {
    console.log("🔗 Starting real blockchain monitoring...");
    
    try {
      await this.realListener.startListening();
      console.log("✅ Real blockchain monitoring started");
    } catch (error) {
      console.error("❌ Failed to start real blockchain monitoring:", error);
      throw error;
    }
  }

  /**
   * Start mock data generation
   */
  async startMockMonitoring() {
    console.log("🎭 Starting mock data generation...");
    
    // Generate mock data every 30 seconds
    this.mockInterval = setInterval(async () => {
      await this.generateMockBridgeData();
    }, 30000);

    console.log("✅ Mock data generation started");
  }

  /**
   * Generate mock bridge transaction data
   */
  async generateMockBridgeData() {
    const protocols = ['STARGATE', 'WORMHOLE', 'SYNAPSE', 'CELER'];
    const chains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'];
    const tokens = ['USDC', 'USDT', 'ETH', 'BNB', 'MATIC'];
    const tokenAddresses = {
      'USDC': '0xA0b86a33E6441b8c4C8B8C4C8C4C8C4C8C4C8C4C',
      'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'ETH': '0x0000000000000000000000000000000000000000',
      'BNB': '0x0000000000000000000000000000000000000000',
      'MATIC': '0x0000000000000000000000000000000000000000'
    };

    const mockTransaction = {
      bridgeProtocol: protocols[Math.floor(Math.random() * protocols.length)],
      sourceChain: chains[Math.floor(Math.random() * chains.length)],
      destinationChain: chains[Math.floor(Math.random() * chains.length)],
      sourceAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      destinationAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      tokenAddress: tokenAddresses[tokens[Math.floor(Math.random() * tokens.length)]],
      tokenSymbol: tokens[Math.floor(Math.random() * tokens.length)],
      amount: (Math.random() * 1000000).toString(),
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: Math.floor(Math.random() * 10000000),
      eventType: 'MockEvent',
      timestamp: new Date(),
      status: Math.random() > 0.5 ? 'COMPLETED' : 'PENDING',
      riskScore: Math.random(),
      riskFlags: Math.random() > 0.8 ? ['HIGH_VALUE_TRANSFER'] : [],
      metadata: {
        mock: true,
        generatedAt: new Date().toISOString()
      }
    };

    try {
      await prisma.bridgeTransaction.create({
        data: mockTransaction
      });

      // Add to queue for processing
      await this.queueManager.addToQueue('bridge_transaction', mockTransaction);

      console.log(`🎭 Generated mock transaction: ${mockTransaction.bridgeProtocol} ${mockTransaction.sourceChain} -> ${mockTransaction.destinationChain}`);
    } catch (error) {
      console.error("Error generating mock data:", error);
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    console.log("🛑 Stopping bridge monitoring...");

    try {
      // Stop real blockchain monitoring
      await this.realListener.stopListening();

      // Stop mock data generation
      if (this.mockInterval) {
        clearInterval(this.mockInterval);
        this.mockInterval = null;
      }

      // Stop queue processing
      await this.queueManager.cleanup();

      this.isMonitoring = false;
      console.log("✅ Bridge monitoring stopped");
    } catch (error) {
      console.error("❌ Error stopping bridge monitoring:", error);
      throw error;
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      monitoringMode: this.monitoringMode,
      realListenerStatus: this.realListener.getStatus(),
      queueStatus: this.queueManager.getStatus()
    };
  }

  /**
   * Get bridge transaction statistics
   */
  async getStatistics() {
    try {
      const stats = await prisma.bridgeTransaction.groupBy({
        by: ['bridgeProtocol', 'status'],
        _count: {
          id: true
        },
        _sum: {
          amount: true
        }
      });

      const totalTransactions = await prisma.bridgeTransaction.count();
      const highRiskTransactions = await prisma.bridgeTransaction.count({
        where: {
          riskScore: {
            gte: 0.7
          }
        }
      });

      return {
        totalTransactions,
        highRiskTransactions,
        protocolStats: stats,
        monitoringStatus: this.getStatus()
      };
    } catch (error) {
      console.error("Error getting statistics:", error);
      throw error;
    }
  }

  /**
   * Get recent bridge transactions
   */
  async getRecentTransactions(limit = 50) {
    try {
      return await prisma.bridgeTransaction.findMany({
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      });
    } catch (error) {
      console.error("Error getting recent transactions:", error);
      throw error;
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
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      });
    } catch (error) {
      console.error("Error getting transactions by protocol:", error);
      throw error;
    }
  }

  /**
   * Get high-risk transactions
   */
  async getHighRiskTransactions(limit = 50) {
    try {
      return await prisma.bridgeTransaction.findMany({
        where: {
          riskScore: {
            gte: 0.7
          }
        },
        orderBy: {
          riskScore: 'desc'
        },
        take: limit
      });
    } catch (error) {
      console.error("Error getting high-risk transactions:", error);
      throw error;
    }
  }

  /**
   * Update monitoring mode
   */
  setMonitoringMode(mode) {
    if (!['MOCK', 'REAL', 'HYBRID'].includes(mode)) {
      throw new Error('Invalid monitoring mode. Must be MOCK, REAL, or HYBRID');
    }

    this.monitoringMode = mode;
    console.log(`🔄 Monitoring mode changed to: ${mode}`);
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    console.log("🧹 Cleaning up Bridge Monitoring Manager...");
    
    try {
      await this.stopMonitoring();
      await prisma.$disconnect();
      console.log("✅ Bridge Monitoring Manager cleaned up");
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
    }
  }
}

// Export the class instead of singleton
module.exports = BridgeMonitoringManager; 