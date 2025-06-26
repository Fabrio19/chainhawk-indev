const { Queue, Worker } = require("bullmq");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { checkWalletSanctions } = require("./sanctionsService");

const prisma = new PrismaClient();

// Redis connection for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

// Create queue for transaction tracing
const tracingQueue = new Queue("transaction-tracing", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

/**
 * Known risky patterns and addresses
 */
const RISKY_PATTERNS = {
  MIXERS: [
    "0x722122df12d4e14e13ac3b6895a86e84145b6967", // Tornado Cash
    "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b", // Tornado Cash
    "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2b0d", // Tornado Cash
    "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf", // Tornado Cash
  ],
  EXCHANGES: [
    // Add known exchange hot wallets
  ],
  DARKNET: [
    // Add known darknet marketplace addresses
  ],
};

/**
 * Transaction Tracing Service
 * Handles blockchain transaction tracing using queues and external APIs
 */

/**
 * Add wallet tracing job to queue
 */
const startTrace = async (walletAddress, chain, depth = 5, userId = null) => {
  // Generate unique trace ID
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create trace record in database
  const trace = await prisma.transactionTrace.create({
    data: {
      traceId,
      walletAddress: walletAddress.toLowerCase(),
      chain,
      depth,
      hopsJson: {},
      riskLevel: 0.0,
      riskFlags: [],
      status: "PENDING",
      requestedBy: userId,
    },
  });

  // Add job to queue
  const job = await tracingQueue.add(
    "trace-wallet",
    {
      traceId,
      walletAddress: walletAddress.toLowerCase(),
      chain,
      depth,
      userId,
    },
    {
      jobId: traceId,
      delay: 0,
    },
  );

  console.log(`🔍 Started trace job: ${traceId} for wallet: ${walletAddress}`);

  return {
    traceId,
    jobId: job.id,
    status: "PENDING",
    estimatedTime: `${depth * 30}s`, // Rough estimate
  };
};

/**
 * Get blockchain transactions using Bitquery API
 */
const getTransactions = async (walletAddress, chain, limit = 100) => {
  // This is a mock implementation - replace with actual Bitquery API
  // For demo purposes, we'll simulate the response

  const mockTransactions = [
    {
      sender: { address: "0x1234567890abcdef1234567890abcdef12345678" },
      receiver: { address: walletAddress },
      amount: "1.5",
      currency: { symbol: "ETH" },
      block: {
        height: 18500000,
        timestamp: { time: "2023-11-01T10:30:00Z" },
      },
      transaction: {
        hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
    },
    {
      sender: { address: walletAddress },
      receiver: { address: "0x987654321fedcba0987654321fedcba098765432" },
      amount: "0.8",
      currency: { symbol: "ETH" },
      block: {
        height: 18500100,
        timestamp: { time: "2023-11-01T11:15:00Z" },
      },
      transaction: {
        hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      },
    },
  ];

  // In production, use actual Bitquery GraphQL query:
  /*
  const query = `
    query GetTransactions($address: String!, $limit: Int!) {
      ethereum {
        transfers(
          any: [
            {receiver: {is: $address}},
            {sender: {is: $address}}
          ],
          date: {since: "2024-01-01"},
          options: {limit: $limit, desc: "block.timestamp.time"}
        ) {
          sender { address }
          receiver { address }
          amount
          currency { symbol }
          block { height timestamp { time } }
          transaction { hash }
        }
      }
    }
  `;

  const response = await axios.post('https://graphql.bitquery.io/', {
    query,
    variables: { address: walletAddress, limit }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.BITQUERY_API_KEY
    }
  });

  return response.data.data.ethereum.transfers;
  */

  return mockTransactions;
};

/**
 * Analyze wallet for risk factors
 */
const analyzeWalletRisk = async (walletAddress, chain) => {
  const risks = [];
  let riskScore = 0.0;

  // Check against sanctions lists
  const sanctionsCheck = await checkWalletSanctions(walletAddress, chain);
  if (sanctionsCheck.riskLevel === "HIGH") {
    risks.push({
      type: "SANCTIONS_MATCH",
      severity: "HIGH",
      description: "Wallet found in sanctions list",
      details: sanctionsCheck.flags,
    });
    riskScore += 0.9;
  }

  // Check against known mixer addresses
  const lowerAddress = walletAddress.toLowerCase();
  if (
    RISKY_PATTERNS.MIXERS.some((mixer) => mixer.toLowerCase() === lowerAddress)
  ) {
    risks.push({
      type: "MIXER_WALLET",
      severity: "HIGH",
      description: "Wallet identified as cryptocurrency mixer",
      details: { mixerType: "Tornado Cash" },
    });
    riskScore += 0.8;
  }

  // Check transaction volume and patterns (mock implementation)
  const transactions = await getTransactions(walletAddress, chain);
  if (transactions.length > 50) {
    risks.push({
      type: "HIGH_VOLUME",
      severity: "MEDIUM",
      description: "High transaction volume detected",
      details: { transactionCount: transactions.length },
    });
    riskScore += 0.3;
  }

  // Check for rapid transactions (potential layering)
  const recentTransactions = transactions.filter((tx) => {
    const txTime = new Date(tx.block.timestamp.time);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return txTime > hourAgo;
  });

  if (recentTransactions.length > 10) {
    risks.push({
      type: "RAPID_TRANSACTIONS",
      severity: "MEDIUM",
      description: "Rapid transaction pattern detected (potential layering)",
      details: { recentCount: recentTransactions.length },
    });
    riskScore += 0.4;
  }

  return {
    walletAddress,
    riskScore: Math.min(riskScore, 1.0), // Cap at 1.0
    risks,
    transactionCount: transactions.length,
    analyzedAt: new Date(),
  };
};

/**
 * Perform full transaction trace
 */
const performTrace = async (
  walletAddress,
  chain,
  depth,
  visitedWallets = new Set(),
) => {
  const hops = [];

  // Prevent infinite loops
  if (visitedWallets.has(walletAddress) || depth <= 0) {
    return hops;
  }

  visitedWallets.add(walletAddress);

  try {
    // Get transactions for this wallet
    const transactions = await getTransactions(walletAddress, chain);

    // Analyze current wallet risk
    const riskAnalysis = await analyzeWalletRisk(walletAddress, chain);

    // Add current hop
    const hop = {
      walletAddress,
      depth: 5 - depth + 1, // Calculate hop number
      riskAnalysis,
      transactions: transactions.slice(0, 10), // Limit to 10 transactions per hop
      connectedWallets: [],
    };

    // Get connected wallets
    const connectedWallets = new Set();
    for (const tx of transactions.slice(0, 20)) {
      // Limit connections
      if (tx.sender.address !== walletAddress) {
        connectedWallets.add(tx.sender.address);
      }
      if (tx.receiver.address !== walletAddress) {
        connectedWallets.add(tx.receiver.address);
      }
    }

    hop.connectedWallets = Array.from(connectedWallets).slice(0, 5); // Limit to 5 connections

    hops.push(hop);

    // Recursively trace connected wallets (limit to 2 per level to prevent explosion)
    for (const connectedWallet of Array.from(connectedWallets).slice(0, 2)) {
      if (!visitedWallets.has(connectedWallet)) {
        const subHops = await performTrace(
          connectedWallet,
          chain,
          depth - 1,
          visitedWallets,
        );
        hops.push(...subHops);
      }
    }
  } catch (error) {
    console.error(`Error tracing wallet ${walletAddress}:`, error);
    hops.push({
      walletAddress,
      depth: 5 - depth + 1,
      error: error.message,
      riskAnalysis: {
        walletAddress,
        riskScore: 0.0,
        risks: [
          {
            type: "TRACE_ERROR",
            severity: "LOW",
            description: "Failed to trace wallet",
            details: { error: error.message },
          },
        ],
      },
    });
  }

  return hops;
};

/**
 * Calculate overall risk level from trace results
 */
const calculateTraceRisk = (hops) => {
  let totalRisk = 0;
  let totalWallets = 0;
  const allFlags = [];

  for (const hop of hops) {
    if (hop.riskAnalysis) {
      totalRisk += hop.riskAnalysis.riskScore;
      totalWallets++;
      allFlags.push(...hop.riskAnalysis.risks);
    }
  }

  const averageRisk = totalWallets > 0 ? totalRisk / totalWallets : 0;
  const maxRisk = Math.max(...hops.map((h) => h.riskAnalysis?.riskScore || 0));

  // Use weighted average of average and max risk
  const finalRisk = averageRisk * 0.6 + maxRisk * 0.4;

  return {
    riskLevel: finalRisk,
    flags: allFlags,
    walletsAnalyzed: totalWallets,
    averageRisk,
    maxRisk,
  };
};

/**
 * Worker to process tracing jobs
 */
const startWorker = () => {
  const worker = new Worker(
    "transaction-tracing",
    async (job) => {
      const { traceId, walletAddress, chain, depth } = job.data;

      console.log(`🔄 Processing trace job: ${traceId}`);

      try {
        // Update status to processing
        await prisma.transactionTrace.update({
          where: { traceId },
          data: {
            status: "PROCESSING",
            startedAt: new Date(),
          },
        });

        // Perform the trace
        const hops = await performTrace(walletAddress, chain, depth);

        // Calculate risk
        const riskAnalysis = calculateTraceRisk(hops);

        // Update database with results
        await prisma.transactionTrace.update({
          where: { traceId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            hopsJson: hops,
            riskLevel: riskAnalysis.riskLevel,
            riskFlags: riskAnalysis.flags,
          },
        });

        console.log(`✅ Completed trace job: ${traceId}`);

        return {
          traceId,
          status: "COMPLETED",
          hops: hops.length,
          riskLevel: riskAnalysis.riskLevel,
        };
      } catch (error) {
        console.error(`❌ Failed trace job: ${traceId}`, error);

        // Update status to failed
        await prisma.transactionTrace.update({
          where: { traceId },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            riskFlags: [
              {
                type: "TRACE_FAILED",
                severity: "LOW",
                description: "Transaction trace failed",
                details: { error: error.message },
              },
            ],
          },
        });

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 3, // Process up to 3 jobs concurrently
    },
  );

  worker.on("completed", (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
  });

  console.log("🚀 Transaction tracing worker started");
  return worker;
};

/**
 * Get trace results
 */
const getTrace = async (traceId) => {
  const trace = await prisma.transactionTrace.findUnique({
    where: { traceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return trace;
};

/**
 * Get user's trace history
 */
const getUserTraces = async (userId, limit = 20) => {
  const traces = await prisma.transactionTrace.findMany({
    where: { requestedBy: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      traceId: true,
      walletAddress: true,
      chain: true,
      depth: true,
      riskLevel: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return traces;
};

module.exports = {
  startTrace,
  getTrace,
  getUserTraces,
  startWorker,
  tracingQueue,
  analyzeWalletRisk,
  calculateTraceRisk,
};
