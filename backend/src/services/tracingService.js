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
 * Blockchain API Configuration
 */
const BLOCKCHAIN_CONFIG = {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d",
    apiUrl: "https://api.etherscan.io/api",
    apiKey: process.env.ETHERSCAN_API_KEY || "YourApiKeyToken",
    chainId: 1,
    symbol: "ETH",
    decimals: 18
  },
  bsc: {
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
    apiUrl: "https://api.bscscan.com/api",
    apiKey: process.env.BSCSCAN_API_KEY || "YourApiKeyToken",
    chainId: 56,
    symbol: "BNB",
    decimals: 18
  },
  polygon: {
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
    apiUrl: "https://api.polygonscan.com/api",
    apiKey: process.env.POLYGONSCAN_API_KEY || "YourApiKeyToken",
    chainId: 137,
    symbol: "MATIC",
    decimals: 18
  }
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
 * Get real blockchain transactions using blockchain APIs
 */
const getTransactions = async (walletAddress, chain, limit = 100) => {
  const config = BLOCKCHAIN_CONFIG[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  try {
    console.log(`🔍 Fetching real transactions for ${walletAddress} on ${chain}...`);
    
    // Get normal transactions
    const normalTxs = await getNormalTransactions(walletAddress, config, limit);
    
    // Get internal transactions (contract interactions)
    const internalTxs = await getInternalTransactions(walletAddress, config, limit);
    
    // Get ERC20 token transfers
    const tokenTxs = await getTokenTransactions(walletAddress, config, limit);
    
    // Combine and sort all transactions by timestamp
    const allTransactions = [...normalTxs, ...internalTxs, ...tokenTxs]
      .sort((a, b) => new Date(b.block.timestamp.time) - new Date(a.block.timestamp.time))
      .slice(0, limit);

    console.log(`✅ Found ${allTransactions.length} real transactions for ${walletAddress} on ${chain}`);
    return allTransactions;

  } catch (error) {
    console.error(`❌ Error fetching transactions for ${walletAddress} on ${chain}:`, error.message);
    
    // Fallback to mock data if API fails
    console.log(`🔄 Falling back to mock data for ${walletAddress}`);
    return getMockTransactions(walletAddress, chain);
  }
};

/**
 * Get normal transactions from blockchain API
 */
const getNormalTransactions = async (walletAddress, config, limit) => {
  try {
    const response = await axios.get(config.apiUrl, {
      params: {
        module: 'account',
        action: 'txlist',
        address: walletAddress,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: limit,
        sort: 'desc',
        apikey: config.apiKey
      },
      timeout: 10000
    });

    if (response.data.status === '1' && response.data.result) {
      return response.data.result.map(tx => ({
        sender: { address: tx.from },
        receiver: { address: tx.to },
        amount: (parseInt(tx.value) / Math.pow(10, config.decimals)).toString(),
        currency: { symbol: config.symbol },
        block: {
          height: parseInt(tx.blockNumber),
          timestamp: { time: new Date(parseInt(tx.timeStamp) * 1000).toISOString() }
        },
        transaction: {
          hash: tx.hash,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          nonce: tx.nonce
        },
        type: 'NORMAL',
        isContract: tx.isError === '1' ? false : true
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching normal transactions:`, error.message);
    return [];
  }
};

/**
 * Get internal transactions (contract interactions)
 */
const getInternalTransactions = async (walletAddress, config, limit) => {
  try {
    const response = await axios.get(config.apiUrl, {
      params: {
        module: 'account',
        action: 'txlistinternal',
        address: walletAddress,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: limit,
        sort: 'desc',
        apikey: config.apiKey
      },
      timeout: 10000
    });

    if (response.data.status === '1' && response.data.result) {
      return response.data.result.map(tx => ({
        sender: { address: tx.from },
        receiver: { address: tx.to },
        amount: (parseInt(tx.value) / Math.pow(10, config.decimals)).toString(),
        currency: { symbol: config.symbol },
        block: {
          height: parseInt(tx.blockNumber),
          timestamp: { time: new Date(parseInt(tx.timeStamp) * 1000).toISOString() }
        },
        transaction: {
          hash: tx.hash,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          nonce: tx.nonce
        },
        type: 'INTERNAL',
        isContract: true
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching internal transactions:`, error.message);
    return [];
  }
};

/**
 * Get ERC20 token transfers
 */
const getTokenTransactions = async (walletAddress, config, limit) => {
  try {
    const response = await axios.get(config.apiUrl, {
      params: {
        module: 'account',
        action: 'tokentx',
        address: walletAddress,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: limit,
        sort: 'desc',
        apikey: config.apiKey
      },
      timeout: 10000
    });

    if (response.data.status === '1' && response.data.result) {
      return response.data.result.map(tx => ({
        sender: { address: tx.from },
        receiver: { address: tx.to },
        amount: (parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal))).toString(),
        currency: { 
          symbol: tx.tokenSymbol,
          address: tx.contractAddress
        },
        block: {
          height: parseInt(tx.blockNumber),
          timestamp: { time: new Date(parseInt(tx.timeStamp) * 1000).toISOString() }
        },
        transaction: {
          hash: tx.hash,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          nonce: tx.nonce
        },
        type: 'TOKEN',
        isContract: true
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching token transactions:`, error.message);
    return [];
  }
};

/**
 * Get mock transactions as fallback
 */
const getMockTransactions = (walletAddress, chain) => {
  const symbol = chain === 'ethereum' ? 'ETH' : chain === 'bsc' ? 'BNB' : 'MATIC';
  
  return [
    {
      sender: { address: "0x1234567890abcdef1234567890abcdef12345678" },
      receiver: { address: walletAddress },
      amount: "1.5",
      currency: { symbol },
      block: {
        height: 18500000,
        timestamp: { time: "2023-11-01T10:30:00Z" },
      },
      transaction: {
        hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
      type: 'MOCK',
      isContract: false
    },
    {
      sender: { address: walletAddress },
      receiver: { address: "0x987654321fedcba0987654321fedcba098765432" },
      amount: "0.8",
      currency: { symbol },
      block: {
        height: 18500100,
        timestamp: { time: "2023-11-01T11:15:00Z" },
      },
      transaction: {
        hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      },
      type: 'MOCK',
      isContract: false
    },
  ];
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

/**
 * Fetch transaction details by hash from Etherscan
 */
async function getTransactionByHash(hash) {
  const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
  const apiUrl = `https://api.etherscan.io/api`;

  // Get transaction details
  const txResp = await axios.get(apiUrl, {
    params: {
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash: hash,
      apikey: apiKey,
    },
    timeout: 10000,
  });

  if (!txResp.data || !txResp.data.result) {
    throw new Error('Transaction not found');
  }
  const tx = txResp.data.result;

  // Get transaction receipt for block/timestamp/gas
  const receiptResp = await axios.get(apiUrl, {
    params: {
      module: 'proxy',
      action: 'eth_getTransactionReceipt',
      txhash: hash,
      apikey: apiKey,
    },
    timeout: 10000,
  });
  const receipt = receiptResp.data.result;

  // Get block for timestamp
  let timestamp = null;
  if (tx.blockNumber) {
    const blockResp = await axios.get(apiUrl, {
      params: {
        module: 'proxy',
        action: 'eth_getBlockByNumber',
        tag: tx.blockNumber,
        boolean: 'true',
        apikey: apiKey,
      },
      timeout: 10000,
    });
    if (blockResp.data && blockResp.data.result) {
      timestamp = parseInt(blockResp.data.result.timestamp, 16);
    }
  }

  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    valueFormatted: tx.value ? (parseInt(tx.value, 16) / 1e18).toString() : '0',
    timestamp: timestamp || null,
    chain: 'ethereum',
    blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
    gasUsed: receipt && receipt.gasUsed ? parseInt(receipt.gasUsed, 16) : null,
  };
}

/**
 * Recursive transaction tracing with depth control
 */
async function traceTransactionRecursive(hash, maxDepth = 3, visited = new Set()) {
  const results = [];
  
  async function traceRecursive(currentHash, currentDepth, visitedSet) {
    // Avoid infinite loops
    if (visitedSet.has(currentHash) || currentDepth > maxDepth) {
      return;
    }
    
    visitedSet.add(currentHash);
    
    try {
      console.log(`🔍 Tracing transaction ${currentHash} at depth ${currentDepth}`);
      
      // Get transaction details
      const tx = await getTransactionByHash(currentHash);
      if (!tx) {
        console.log(`❌ Transaction ${currentHash} not found`);
        return;
      }
      
      // Add current transaction to results
      results.push({
        ...tx,
        depth: currentDepth,
        traceId: hash // Use original hash as trace ID
      });
      
      // If we haven't reached max depth and there's a 'to' address, continue tracing
      if (currentDepth < maxDepth && tx.to && tx.to !== '0x0000000000000000000000000000000000000000') {
        try {
          // Get outgoing transactions from the 'to' address
          const outgoingTxs = await getOutgoingTransactions(tx.to, 10); // Limit to 10 outgoing txs
          
          for (const outgoingTx of outgoingTxs) {
            if (!visitedSet.has(outgoingTx.hash)) {
              await traceRecursive(outgoingTx.hash, currentDepth + 1, visitedSet);
            }
          }
        } catch (error) {
          console.log(`⚠️ Error getting outgoing transactions for ${tx.to}:`, error.message);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error tracing transaction ${currentHash}:`, error.message);
    }
  }
  
  await traceRecursive(hash, 0, visited);
  return results;
}

/**
 * Get outgoing transactions from an address using Etherscan API
 */
async function getOutgoingTransactions(address, limit = 10) {
  const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
  const apiUrl = `https://api.etherscan.io/api`;
  
  try {
    const response = await axios.get(apiUrl, {
      params: {
        module: 'account',
        action: 'txlist',
        address: address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: limit,
        sort: 'desc',
        apikey: apiKey
      },
      timeout: 10000
    });
    
    if (response.data.status === '1' && response.data.result) {
      return response.data.result.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        blockNumber: parseInt(tx.blockNumber),
        timestamp: parseInt(tx.timeStamp)
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching outgoing transactions for ${address}:`, error.message);
    return [];
  }
}

/**
 * Enhanced transaction tracing with recursive support
 */
async function traceTransactionWithDepth(hash, depth = 3) {
  try {
    console.log(`🚀 Starting recursive trace for ${hash} with depth ${depth}`);
    
    const visited = new Set();
    const traceResults = await traceTransactionRecursive(hash, depth, visited);
    
    // Calculate risk metrics
    const riskMetrics = calculateTraceRiskMetrics(traceResults);
    
    return {
      traceId: hash,
      originalHash: hash,
      depth: depth,
      totalTransactions: traceResults.length,
      visitedAddresses: visited.size,
      transactions: traceResults,
      riskMetrics: riskMetrics,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in recursive transaction tracing:', error.message);
    throw error;
  }
}

/**
 * Calculate risk metrics for trace results
 */
function calculateTraceRiskMetrics(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      riskLevel: 0,
      riskFlags: [],
      totalVolume: 0,
      uniqueAddresses: 0,
      maxDepth: 0
    };
  }
  
  const uniqueAddresses = new Set();
  let totalVolume = 0;
  let maxDepth = 0;
  const riskFlags = [];
  
  transactions.forEach(tx => {
    uniqueAddresses.add(tx.from);
    uniqueAddresses.add(tx.to);
    totalVolume += parseFloat(tx.valueFormatted || 0);
    maxDepth = Math.max(maxDepth, tx.depth || 0);
  });
  
  // Calculate risk level based on various factors
  let riskLevel = 0;
  
  // Higher risk for more transactions
  if (transactions.length > 50) {
    riskLevel += 30;
    riskFlags.push('HIGH_TRANSACTION_COUNT');
  }
  
  // Higher risk for deeper traces
  if (maxDepth > 5) {
    riskLevel += 25;
    riskFlags.push('DEEP_TRACE');
  }
  
  // Higher risk for large volumes
  if (totalVolume > 100) {
    riskLevel += 20;
    riskFlags.push('HIGH_VOLUME');
  }
  
  // Higher risk for many unique addresses
  if (uniqueAddresses.size > 20) {
    riskLevel += 15;
    riskFlags.push('MANY_ADDRESSES');
  }
  
  // Check for known risky addresses (placeholder)
  const riskyAddresses = [
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT contract
    '0xa0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c'  // Example risky address
  ];
  
  transactions.forEach(tx => {
    if (riskyAddresses.includes(tx.to?.toLowerCase()) || riskyAddresses.includes(tx.from?.toLowerCase())) {
      riskLevel += 10;
      if (!riskFlags.includes('RISKY_ADDRESS')) {
        riskFlags.push('RISKY_ADDRESS');
      }
    }
  });
  
  return {
    riskLevel: Math.min(riskLevel, 100), // Cap at 100
    riskFlags: [...new Set(riskFlags)], // Remove duplicates
    totalVolume: totalVolume,
    uniqueAddresses: uniqueAddresses.size,
    maxDepth: maxDepth
  };
}

module.exports = {
  startTrace,
  getTrace,
  getUserTraces,
  startWorker,
  tracingQueue,
  analyzeWalletRisk,
  calculateTraceRisk,
  getTransactionByHash,
  traceTransactionRecursive,
  traceTransactionWithDepth,
  getOutgoingTransactions,
  calculateTraceRiskMetrics,
};
