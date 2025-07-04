const express = require("express");
const router = express.Router();
const {
  getBridgeTransactions,
  getBridgeTransactionById,
  getBridgeStatistics,
  getBridgeConfigurations,
  startBridgeMonitoring,
  getWalletBridgeActivity,
  searchBridgeTransactions,
} = require("../controllers/bridgeController");
const { authenticateToken } = require("../middlewares/auth");

// Apply authentication middleware to all routes
// router.use(authenticateToken); // Temporarily commented out for testing

/**
 * @route GET /api/bridges/transactions
 * @desc Get all bridge transactions with pagination and filtering
 * @access Private
 */
router.get("/transactions", getBridgeTransactions);

/**
 * @route GET /api/bridges/transactions/:id
 * @desc Get bridge transaction by ID
 * @access Private
 */
router.get("/transactions/:id", getBridgeTransactionById);

/**
 * @route GET /api/bridges/statistics
 * @desc Get bridge transaction statistics
 * @access Private
 */
router.get("/statistics", getBridgeStatistics);

/**
 * @route GET /api/bridges/configurations
 * @desc Get bridge configurations
 * @access Private
 */
router.get("/configurations", getBridgeConfigurations);

/**
 * @route POST /api/bridges/start-monitoring
 * @desc Start bridge monitoring
 * @access Private
 */
router.post("/start-monitoring", startBridgeMonitoring);

/**
 * @route GET /api/bridges/wallet/:walletAddress
 * @desc Get wallet bridge activity
 * @access Private
 */
router.get("/wallet/:walletAddress", getWalletBridgeActivity);

/**
 * @route GET /api/bridges/search
 * @desc Search bridge transactions
 * @access Private
 */
router.get("/search", searchBridgeTransactions);

module.exports = router; 