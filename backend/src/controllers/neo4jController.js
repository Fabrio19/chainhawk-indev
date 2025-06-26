const { validationResult } = require("express-validator");
const neo4jService = require("../services/neo4jService");

/**
 * Neo4j Controller
 * Handles graph analysis and deep transaction tracing
 */

/**
 * Initialize Neo4j connection
 * POST /neo4j/connect
 */
const connectNeo4j = async (req, res) => {
  try {
    await neo4jService.connect();
    
    res.json({
      message: "Neo4j connection established",
      connected: neo4jService.isConnected,
    });
  } catch (error) {
    console.error("Neo4j connection error:", error);
    res.status(500).json({
      error: "Failed to connect to Neo4j",
      code: "NEO4J_CONNECTION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Add wallet to graph
 * POST /neo4j/wallets
 */
const addWalletToGraph = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const walletData = req.body;
    const wallet = await neo4jService.addWallet(walletData);

    res.status(201).json({
      message: "Wallet added to graph",
      wallet,
    });
  } catch (error) {
    console.error("Add wallet to graph error:", error);
    res.status(500).json({
      error: "Failed to add wallet to graph",
      code: "WALLET_GRAPH_ADD_FAILED",
      details: error.message,
    });
  }
};

/**
 * Add transaction to graph
 * POST /neo4j/transactions
 */
const addTransactionToGraph = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const transactionData = req.body;
    const transaction = await neo4jService.addTransaction(transactionData);

    res.status(201).json({
      message: "Transaction added to graph",
      transaction,
    });
  } catch (error) {
    console.error("Add transaction to graph error:", error);
    res.status(500).json({
      error: "Failed to add transaction to graph",
      code: "TRANSACTION_GRAPH_ADD_FAILED",
      details: error.message,
    });
  }
};

/**
 * Deep transaction tracing
 * POST /neo4j/trace
 */
const traceTransactionPath = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { startAddress, maxDepth = 5, maxPaths = 10 } = req.body;
    
    const paths = await neo4jService.traceTransactionPath(startAddress, maxDepth, maxPaths);

    res.json({
      startAddress,
      maxDepth,
      maxPaths,
      paths,
      pathCount: paths ? paths.length : 0,
    });
  } catch (error) {
    console.error("Transaction tracing error:", error);
    res.status(500).json({
      error: "Failed to trace transaction path",
      code: "TRANSACTION_TRACE_FAILED",
      details: error.message,
    });
  }
};

/**
 * Find high-risk patterns
 * GET /neo4j/patterns/high-risk
 */
const findHighRiskPatterns = async (req, res) => {
  try {
    const { riskThreshold = 70 } = req.query;
    
    const patterns = await neo4jService.findHighRiskPatterns(parseInt(riskThreshold));

    res.json({
      riskThreshold: parseInt(riskThreshold),
      patterns,
      patternCount: patterns ? patterns.length : 0,
    });
  } catch (error) {
    console.error("High-risk patterns error:", error);
    res.status(500).json({
      error: "Failed to find high-risk patterns",
      code: "HIGH_RISK_PATTERNS_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get wallet cluster
 * GET /neo4j/cluster/:address
 */
const getWalletCluster = async (req, res) => {
  try {
    const { address } = req.params;
    const { radius = 2 } = req.query;
    
    const cluster = await neo4jService.getWalletCluster(address, parseInt(radius));

    res.json({
      walletAddress: address,
      clusterRadius: parseInt(radius),
      cluster,
      clusterSize: cluster ? cluster.length : 0,
    });
  } catch (error) {
    console.error("Wallet cluster error:", error);
    res.status(500).json({
      error: "Failed to get wallet cluster",
      code: "WALLET_CLUSTER_FAILED",
      details: error.message,
    });
  }
};

/**
 * Analyze money flow
 * POST /neo4j/money-flow
 */
const analyzeMoneyFlow = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { sourceAddress, targetAddress, maxHops = 5 } = req.body;
    
    const flows = await neo4jService.analyzeMoneyFlow(sourceAddress, targetAddress, maxHops);

    res.json({
      sourceAddress,
      targetAddress,
      maxHops,
      flows,
      flowCount: flows ? flows.length : 0,
    });
  } catch (error) {
    console.error("Money flow analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze money flow",
      code: "MONEY_FLOW_ANALYSIS_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get graph statistics
 * GET /neo4j/stats
 */
const getGraphStats = async (req, res) => {
  try {
    const stats = await neo4jService.getGraphStats();

    res.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Graph stats error:", error);
    res.status(500).json({
      error: "Failed to get graph statistics",
      code: "GRAPH_STATS_FAILED",
      details: error.message,
    });
  }
};

/**
 * Add entity to graph
 * POST /neo4j/entities
 */
const addEntityToGraph = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const entityData = req.body;
    const entity = await neo4jService.addEntity(entityData);

    res.status(201).json({
      message: "Entity added to graph",
      entity,
    });
  } catch (error) {
    console.error("Add entity to graph error:", error);
    res.status(500).json({
      error: "Failed to add entity to graph",
      code: "ENTITY_GRAPH_ADD_FAILED",
      details: error.message,
    });
  }
};

/**
 * Link wallet to entity
 * POST /neo4j/link
 */
const linkWalletToEntity = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { walletAddress, entityId, relationshipType = "BELONGS_TO" } = req.body;
    
    const link = await neo4jService.linkWalletToEntity(walletAddress, entityId, relationshipType);

    res.json({
      message: "Wallet linked to entity",
      link,
    });
  } catch (error) {
    console.error("Link wallet to entity error:", error);
    res.status(500).json({
      error: "Failed to link wallet to entity",
      code: "WALLET_ENTITY_LINK_FAILED",
      details: error.message,
    });
  }
};

module.exports = {
  connectNeo4j,
  addWalletToGraph,
  addTransactionToGraph,
  traceTransactionPath,
  findHighRiskPatterns,
  getWalletCluster,
  analyzeMoneyFlow,
  getGraphStats,
  addEntityToGraph,
  linkWalletToEntity,
}; 