const express = require("express");
const { body, param } = require("express-validator");
const {
  searchWallet,
  getWalletTransactions,
  getWalletRiskProfile,
} = require("../controllers/walletController");
const { authenticateToken } = require("../middlewares/auth");
const { auditLog } = require("../middlewares/audit");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

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

// Get wallet transactions
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

// Get wallet risk profile
router.get(
  "/:address/risk-profile",
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
  ],
  auditLog,
  getWalletRiskProfile
);

module.exports = router; 