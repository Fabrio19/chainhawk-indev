const express = require("express");
const { body, param, query } = require("express-validator");
const { asyncHandler } = require("../middlewares/error");
const {
  authMiddleware,
  requirePermission,
  requireAnalyst,
} = require("../middlewares/auth");
const {
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
} = require("../controllers/neo4jController");

const router = express.Router();

// All Neo4j routes require authentication
router.use(authMiddleware);

/**
 * POST /neo4j/connect - Initialize Neo4j connection
 */
router.post(
  "/connect",
  requireAnalyst,
  asyncHandler(connectNeo4j),
);

/**
 * POST /neo4j/wallets - Add wallet to graph
 * Body: { address, chain, balance, riskScore, lastActivity, labels, isBlacklisted, entityType }
 */
router.post(
  "/wallets",
  requirePermission("graph_analysis"),
  [
    body("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid wallet address is required"),
    body("chain")
      .isString()
      .isIn(["ethereum", "bitcoin", "polygon", "bsc", "arbitrum", "optimism"])
      .withMessage("Valid chain is required"),
    body("balance")
      .isFloat({ min: 0 })
      .withMessage("Balance must be a positive number"),
    body("riskScore")
      .isInt({ min: 0, max: 100 })
      .withMessage("Risk score must be between 0 and 100"),
  ],
  asyncHandler(addWalletToGraph),
);

/**
 * POST /neo4j/transactions - Add transaction to graph
 * Body: { hash, from, to, amount, currency, timestamp, chain, blockNumber, gasUsed, riskFlags, category }
 */
router.post(
  "/transactions",
  requirePermission("graph_analysis"),
  [
    body("hash")
      .isString()
      .trim()
      .isLength({ min: 64, max: 66 })
      .withMessage("Valid transaction hash is required"),
    body("from")
      .isString()
      .trim()
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid from address is required"),
    body("to")
      .isString()
      .trim()
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid to address is required"),
    body("amount")
      .isFloat({ min: 0 })
      .withMessage("Amount must be a positive number"),
    body("currency")
      .isString()
      .isIn(["ETH", "BTC", "USDT", "USDC", "BNB", "MATIC"])
      .withMessage("Valid currency is required"),
    body("chain")
      .isString()
      .isIn(["ethereum", "bitcoin", "polygon", "bsc", "arbitrum", "optimism"])
      .withMessage("Valid chain is required"),
  ],
  asyncHandler(addTransactionToGraph),
);

/**
 * POST /neo4j/trace - Deep transaction tracing
 * Body: { startAddress, maxDepth?, maxPaths? }
 */
router.post(
  "/trace",
  requirePermission("transaction_tracing"),
  [
    body("startAddress")
      .isString()
      .trim()
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid start address is required"),
    body("maxDepth")
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage("Max depth must be between 1 and 10"),
    body("maxPaths")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Max paths must be between 1 and 50"),
  ],
  asyncHandler(traceTransactionPath),
);

/**
 * GET /neo4j/patterns/high-risk - Find high-risk patterns
 * Query: riskThreshold?
 */
router.get(
  "/patterns/high-risk",
  requirePermission("graph_analysis"),
  [
    query("riskThreshold")
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage("Risk threshold must be between 0 and 100"),
  ],
  asyncHandler(findHighRiskPatterns),
);

/**
 * GET /neo4j/cluster/:address - Get wallet cluster
 * Query: radius?
 */
router.get(
  "/cluster/:address",
  requirePermission("graph_analysis"),
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid wallet address is required"),
    query("radius")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Cluster radius must be between 1 and 5"),
  ],
  asyncHandler(getWalletCluster),
);

/**
 * POST /neo4j/money-flow - Analyze money flow
 * Body: { sourceAddress, targetAddress, maxHops? }
 */
router.post(
  "/money-flow",
  requirePermission("transaction_tracing"),
  [
    body("sourceAddress")
      .isString()
      .trim()
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid source address is required"),
    body("targetAddress")
      .isString()
      .trim()
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid target address is required"),
    body("maxHops")
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage("Max hops must be between 1 and 10"),
  ],
  asyncHandler(analyzeMoneyFlow),
);

/**
 * GET /neo4j/stats - Get graph statistics
 */
router.get(
  "/stats",
  requirePermission("graph_analysis"),
  asyncHandler(getGraphStats),
);

/**
 * POST /neo4j/entities - Add entity to graph
 * Body: { id, name, type, address?, chain?, riskLevel?, description?, metadata? }
 */
router.post(
  "/entities",
  requirePermission("graph_analysis"),
  [
    body("id")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Entity ID is required"),
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Entity name is required"),
    body("type")
      .isString()
      .isIn(["exchange", "mixer", "defi", "darknet", "individual", "entity"])
      .withMessage("Valid entity type is required"),
    body("riskLevel")
      .optional()
      .isString()
      .isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
      .withMessage("Valid risk level is required"),
  ],
  asyncHandler(addEntityToGraph),
);

/**
 * POST /neo4j/link - Link wallet to entity
 * Body: { walletAddress, entityId, relationshipType? }
 */
router.post(
  "/link",
  requirePermission("graph_analysis"),
  [
    body("walletAddress")
      .isString()
      .trim()
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid wallet address is required"),
    body("entityId")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Entity ID is required"),
    body("relationshipType")
      .optional()
      .isString()
      .isIn(["BELONGS_TO", "CONTROLS", "OPERATES", "USES"])
      .withMessage("Valid relationship type is required"),
  ],
  asyncHandler(linkWalletToEntity),
);

module.exports = router; 