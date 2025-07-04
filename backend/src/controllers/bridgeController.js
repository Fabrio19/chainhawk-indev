const { PrismaClient } = require("@prisma/client");
const { startBridgeWorker, scheduleBridgeMonitoring, BRIDGE_CONFIGS } = require("../services/bridgeMonitor");

const prisma = new PrismaClient();

/**
 * Get all bridge transactions with pagination and filtering
 */
const getBridgeTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      protocol,
      sourceChain,
      destinationChain,
      sourceAddress,
      destinationAddress,
      status,
      riskScore,
      startDate,
      endDate,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    if (protocol) where.bridgeProtocol = protocol;
    if (sourceChain) where.sourceChain = sourceChain;
    if (destinationChain) where.destinationChain = destinationChain;
    if (sourceAddress) where.sourceAddress = { contains: sourceAddress, mode: "insensitive" };
    if (destinationAddress) where.destinationAddress = { contains: destinationAddress, mode: "insensitive" };
    if (status) where.status = status;
    if (riskScore) where.riskScore = { gte: parseFloat(riskScore) };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Get transactions with linked transaction data
    const transactions = await prisma.bridgeTransaction.findMany({
      where,
      include: {
        linkedTransaction: {
          select: {
            id: true,
            transactionHash: true,
            sourceChain: true,
            destinationChain: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    // Get total count
    const total = await prisma.bridgeTransaction.count({ where });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching bridge transactions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bridge transactions",
    });
  }
};

/**
 * Get bridge transaction by ID
 */
const getBridgeTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.bridgeTransaction.findUnique({
      where: { id },
      include: {
        linkedTransaction: {
          select: {
            id: true,
            bridgeProtocol: true,
            sourceChain: true,
            destinationChain: true,
            sourceAddress: true,
            destinationAddress: true,
            tokenAddress: true,
            tokenSymbol: true,
            amount: true,
            transactionHash: true,
            blockNumber: true,
            eventType: true,
            timestamp: true,
            status: true,
            riskScore: true,
            riskFlags: true,
            metadata: true,
          },
        },
        linkedTransactions: {
          select: {
            id: true,
            bridgeProtocol: true,
            sourceChain: true,
            destinationChain: true,
            sourceAddress: true,
            destinationAddress: true,
            tokenAddress: true,
            tokenSymbol: true,
            amount: true,
            transactionHash: true,
            blockNumber: true,
            eventType: true,
            timestamp: true,
            status: true,
            riskScore: true,
            riskFlags: true,
            metadata: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Bridge transaction not found",
      });
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Error fetching bridge transaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bridge transaction",
    });
  }
};

/**
 * Get bridge transaction statistics
 */
const getBridgeStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Get statistics by protocol
    const protocolStats = await prisma.bridgeTransaction.groupBy({
      by: ["bridgeProtocol"],
      where,
      _count: {
        id: true,
      },
      _sum: {
        riskScore: true,
      },
    });

    // Get statistics by chain
    const chainStats = await prisma.bridgeTransaction.groupBy({
      by: ["sourceChain"],
      where,
      _count: {
        id: true,
      },
    });

    // Get risk distribution
    const riskDistribution = await prisma.bridgeTransaction.groupBy({
      by: ["riskScore"],
      where: {
        ...where,
        riskScore: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // Get status distribution
    const statusDistribution = await prisma.bridgeTransaction.groupBy({
      by: ["status"],
      where,
      _count: {
        id: true,
      },
    });

    // Get total volume by token
    const tokenVolume = await prisma.bridgeTransaction.groupBy({
      by: ["tokenSymbol"],
      where,
      _sum: {
        amount: true,
      },
    });

    res.json({
      success: true,
      data: {
        protocolStats,
        chainStats,
        riskDistribution,
        statusDistribution,
        tokenVolume,
      },
    });
  } catch (error) {
    console.error("Error fetching bridge statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bridge statistics",
    });
  }
};

/**
 * Get bridge configurations
 */
const getBridgeConfigurations = async (req, res) => {
  try {
    res.json({
      success: true,
      data: BRIDGE_CONFIGS,
    });
  } catch (error) {
    console.error("Error fetching bridge configurations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bridge configurations",
    });
  }
};

/**
 * Start bridge monitoring
 */
const startBridgeMonitoring = async (req, res) => {
  try {
    // Start the bridge worker
    const worker = startBridgeWorker();

    // Schedule monitoring jobs
    await scheduleBridgeMonitoring();

    res.json({
      success: true,
      message: "Bridge monitoring started successfully",
    });
  } catch (error) {
    console.error("Error starting bridge monitoring:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start bridge monitoring",
    });
  }
};

/**
 * Get wallet bridge activity
 */
const getWalletBridgeActivity = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get bridge transactions for the wallet
    const transactions = await prisma.bridgeTransaction.findMany({
      where: {
        OR: [
          { sourceAddress: { contains: walletAddress, mode: "insensitive" } },
          { destinationAddress: { contains: walletAddress, mode: "insensitive" } },
        ],
      },
      include: {
        linkedTransaction: {
          select: {
            id: true,
            transactionHash: true,
            sourceChain: true,
            destinationChain: true,
            status: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      skip,
      take,
    });

    // Get total count
    const total = await prisma.bridgeTransaction.count({
      where: {
        OR: [
          { sourceAddress: { contains: walletAddress, mode: "insensitive" } },
          { destinationAddress: { contains: walletAddress, mode: "insensitive" } },
        ],
      },
    });

    // Calculate wallet bridge statistics
    const stats = await prisma.bridgeTransaction.groupBy({
      by: ["bridgeProtocol"],
      where: {
        OR: [
          { sourceAddress: { contains: walletAddress, mode: "insensitive" } },
          { destinationAddress: { contains: walletAddress, mode: "insensitive" } },
        ],
      },
      _count: {
        id: true,
      },
      _sum: {
        riskScore: true,
      },
    });

    res.json({
      success: true,
      data: {
        transactions,
        statistics: stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching wallet bridge activity:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch wallet bridge activity",
    });
  }
};

/**
 * Search bridge transactions
 */
const searchBridgeTransactions = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query is required",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Search in multiple fields
    const transactions = await prisma.bridgeTransaction.findMany({
      where: {
        OR: [
          { transactionHash: { contains: query, mode: "insensitive" } },
          { sourceAddress: { contains: query, mode: "insensitive" } },
          { destinationAddress: { contains: query, mode: "insensitive" } },
          { tokenAddress: { contains: query, mode: "insensitive" } },
          { tokenSymbol: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        linkedTransaction: {
          select: {
            id: true,
            transactionHash: true,
            sourceChain: true,
            destinationChain: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    // Get total count
    const total = await prisma.bridgeTransaction.count({
      where: {
        OR: [
          { transactionHash: { contains: query, mode: "insensitive" } },
          { sourceAddress: { contains: query, mode: "insensitive" } },
          { destinationAddress: { contains: query, mode: "insensitive" } },
          { tokenAddress: { contains: query, mode: "insensitive" } },
          { tokenSymbol: { contains: query, mode: "insensitive" } },
        ],
      },
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error searching bridge transactions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search bridge transactions",
    });
  }
};

module.exports = {
  getBridgeTransactions,
  getBridgeTransactionById,
  getBridgeStatistics,
  getBridgeConfigurations,
  startBridgeMonitoring,
  getWalletBridgeActivity,
  searchBridgeTransactions,
}; 