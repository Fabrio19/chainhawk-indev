const { Queue, Worker } = require("bullmq");
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
// const Web3 = require("web3"); // Temporarily disabled
const { BRIDGE_CONFIGS, BRIDGE_EVENTS } = require("./bridgeConfig");

const prisma = new PrismaClient();

// Redis connection for bridge monitoring queue
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

// Create queue for bridge monitoring
const bridgeQueue = new Queue("bridge-monitoring", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

/**
 * Store bridge transaction in database
 */
const storeBridgeTransaction = async (bridgeData) => {
  try {
    const bridgeTx = await prisma.bridgeTransaction.create({
      data: {
        bridgeProtocol: bridgeData.protocol,
        sourceChain: bridgeData.sourceChain,
        destinationChain: bridgeData.destinationChain,
        sourceAddress: bridgeData.sourceAddress,
        destinationAddress: bridgeData.destinationAddress,
        tokenAddress: bridgeData.tokenAddress,
        tokenSymbol: bridgeData.tokenSymbol,
        amount: bridgeData.amount,
        transactionHash: bridgeData.txHash,
        blockNumber: bridgeData.blockNumber,
        eventType: bridgeData.eventType,
        timestamp: new Date(bridgeData.timestamp * 1000),
        status: "PENDING",
        metadata: bridgeData.metadata || {},
      },
    });

    console.log(`🔗 Stored bridge transaction: ${bridgeTx.id} for ${bridgeData.protocol}`);
    return bridgeTx;
  } catch (error) {
    console.error("Error storing bridge transaction:", error);
    throw error;
  }
};

/**
 * Link bridge transactions across chains
 */
const linkBridgeTransactions = async (bridgeTxId) => {
  try {
    const bridgeTx = await prisma.bridgeTransaction.findUnique({
      where: { id: bridgeTxId },
    });

    if (!bridgeTx) return;

    // Find matching bridge transaction on destination chain
    const matchingTx = await prisma.bridgeTransaction.findFirst({
      where: {
        bridgeProtocol: bridgeTx.bridgeProtocol,
        sourceChain: bridgeTx.destinationChain,
        destinationChain: bridgeTx.sourceChain,
        sourceAddress: bridgeTx.destinationAddress,
        destinationAddress: bridgeTx.sourceAddress,
        tokenAddress: bridgeTx.tokenAddress,
        amount: bridgeTx.amount,
        status: "PENDING",
        timestamp: {
          gte: new Date(bridgeTx.timestamp.getTime() - 30 * 60 * 1000), // 30 minutes
          lte: new Date(bridgeTx.timestamp.getTime() + 30 * 60 * 1000), // 30 minutes
        },
      },
    });

    if (matchingTx) {
      // Update both transactions as linked
      await prisma.bridgeTransaction.updateMany({
        where: {
          id: { in: [bridgeTx.id, matchingTx.id] },
        },
        data: {
          status: "COMPLETED",
          linkedTransactionId: matchingTx.id,
        },
      });

      console.log(`🔗 Linked bridge transactions: ${bridgeTx.id} ↔ ${matchingTx.id}`);
    }
  } catch (error) {
    console.error("Error linking bridge transactions:", error);
  }
};

/**
 * Analyze bridge transaction for risk
 */
const analyzeBridgeRisk = async (bridgeTxId) => {
  try {
    const bridgeTx = await prisma.bridgeTransaction.findUnique({
      where: { id: bridgeTxId },
      include: { linkedTransaction: true },
    });

    if (!bridgeTx) return;

    let riskScore = 0;
    const riskFlags = [];

    // Check if source or destination address is sanctioned
    const sourceSanctions = await prisma.sanctionsWatchlist.findFirst({
      where: { walletAddress: bridgeTx.sourceAddress, isActive: true },
    });

    const destSanctions = await prisma.sanctionsWatchlist.findFirst({
      where: { walletAddress: bridgeTx.destinationAddress, isActive: true },
    });

    if (sourceSanctions || destSanctions) {
      riskScore += 0.8;
      riskFlags.push({
        type: "SANCTIONS_MATCH",
        severity: "HIGH",
        description: "Bridge transaction involves sanctioned address",
        details: { sourceSanctions: !!sourceSanctions, destSanctions: !!destSanctions },
      });
    }

    // Check for high-value transfers
    if (parseFloat(bridgeTx.amount) > 100000) {
      riskScore += 0.3;
      riskFlags.push({
        type: "HIGH_VALUE_TRANSFER",
        severity: "MEDIUM",
        description: "High-value bridge transfer detected",
        details: { amount: bridgeTx.amount },
      });
    }

    // Check for rapid bridge usage
    const recentBridges = await prisma.bridgeTransaction.count({
      where: {
        OR: [
          { sourceAddress: bridgeTx.sourceAddress },
          { destinationAddress: bridgeTx.destinationAddress },
        ],
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentBridges > 10) {
      riskScore += 0.4;
      riskFlags.push({
        type: "FREQUENT_BRIDGE_USAGE",
        severity: "MEDIUM",
        description: "Frequent bridge usage detected",
        details: { recentBridges },
      });
    }

    // Update bridge transaction with risk analysis
    await prisma.bridgeTransaction.update({
      where: { id: bridgeTxId },
      data: {
        riskScore: Math.min(riskScore, 1.0),
        riskFlags: riskFlags,
        analyzedAt: new Date(),
      },
    });

    console.log(`🛡️ Risk analysis for bridge ${bridgeTxId}: ${riskScore.toFixed(2)}`);
  } catch (error) {
    console.error("Error analyzing bridge risk:", error);
  }
};

/**
 * Start bridge monitoring worker
 */
const startBridgeWorker = () => {
  const worker = new Worker(
    "bridge-monitoring",
    async (job) => {
      const { bridgeProtocol, network, contractAddress, eventType, fromBlock, toBlock } = job.data;

      console.log(`🔍 Monitoring ${bridgeProtocol} on ${network} from block ${fromBlock} to ${toBlock}`);

      try {
        // This will be implemented by individual bridge monitors
        // For now, we'll simulate bridge event detection
        const mockBridgeEvent = {
          protocol: bridgeProtocol,
          sourceChain: network,
          destinationChain: "ethereum", // Mock destination
          sourceAddress: "0x" + Math.random().toString(16).substr(2, 40),
          destinationAddress: "0x" + Math.random().toString(16).substr(2, 40),
          tokenAddress: "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8",
          tokenSymbol: "USDC",
          amount: (Math.random() * 10000).toFixed(2),
          txHash: "0x" + Math.random().toString(16).substr(2, 64),
          blockNumber: fromBlock + Math.floor(Math.random() * (toBlock - fromBlock)),
          eventType: eventType,
          timestamp: Math.floor(Date.now() / 1000),
          metadata: {
            contractAddress,
            network,
          },
        };

        // Store bridge transaction
        const bridgeTx = await storeBridgeTransaction(mockBridgeEvent);

        // Link transactions
        await linkBridgeTransactions(bridgeTx.id);

        // Analyze risk
        await analyzeBridgeRisk(bridgeTx.id);

        return {
          bridgeTxId: bridgeTx.id,
          status: "COMPLETED",
        };
      } catch (error) {
        console.error(`❌ Bridge monitoring error for ${bridgeProtocol}:`, error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(`✅ Bridge monitoring job ${job.id} completed:`, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Bridge monitoring job ${job?.id} failed:`, err);
  });

  console.log("🚀 Bridge monitoring worker started");
  return worker;
};

/**
 * Schedule bridge monitoring jobs
 */
const scheduleBridgeMonitoring = async () => {
  // Schedule monitoring for each bridge protocol
  for (const [protocol, config] of Object.entries(BRIDGE_CONFIGS)) {
    for (const [network, networkConfig] of Object.entries(config.networks)) {
      for (const contractAddress of networkConfig.contracts) {
        // Schedule monitoring job every 5 minutes
        await bridgeQueue.add(
          `monitor-${protocol}-${network}-${contractAddress}`,
          {
            bridgeProtocol: protocol,
            network,
            contractAddress,
            eventType: "all",
            fromBlock: "latest",
            toBlock: "latest",
          },
          {
            repeat: {
              pattern: "*/5 * * * *", // Every 5 minutes
            },
          }
        );
      }
    }
  }

  console.log("📅 Bridge monitoring jobs scheduled");
};

module.exports = {
  bridgeQueue,
  startBridgeWorker,
  scheduleBridgeMonitoring,
  storeBridgeTransaction,
  linkBridgeTransactions,
  analyzeBridgeRisk,
  BRIDGE_CONFIGS,
  BRIDGE_EVENTS,
}; 