const express = require("express");
const { body, param } = require("express-validator");
const {
  searchWallet,
  getWalletTransactions,
  getWalletRiskProfile,
  getWalletAnalysis,
  getWalletTokenHoldings,
  getWalletInternalTransactions,
  getContractABI,
  getApiStatus,
  searchWallets,
  getWalletRiskAssessment
} = require("../controllers/walletController");
const { authenticateToken } = require("../middlewares/auth");
const { auditLog } = require("../middlewares/audit");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Search wallets
router.get("/search", searchWallets);

// Get API status
router.get("/api-status", getApiStatus);

// Search wallet by address
router.get(
  "/:address",
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
  ],
  auditLog,
  searchWallet
);

// Get wallet transactions (real blockchain data)
router.get(
  "/:address/transactions",
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
  ],
  auditLog,
  getWalletTransactions
);

// Get comprehensive wallet analysis
router.get(
  "/:address/analysis",
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
  ],
  auditLog,
  getWalletAnalysis
);

// Get wallet token holdings
router.get(
  "/:address/token-holdings",
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
  ],
  auditLog,
  getWalletTokenHoldings
);

// Get wallet internal transactions
router.get(
  "/:address/internal-transactions",
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
  ],
  auditLog,
  getWalletInternalTransactions
);

// Get contract ABI
router.get(
  "/:address/contract-abi",
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
  ],
  auditLog,
  getContractABI
);

// Get wallet risk assessment
router.get(
  "/:address/risk-assessment",
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
  ],
  auditLog,
  getWalletRiskAssessment
);

// Legacy endpoints (keeping for backward compatibility)
router.get("/search/:address", searchWallet);
router.get("/:address/risk-profile", getWalletRiskProfile);

module.exports = router; 