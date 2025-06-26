const express = require("express");
const { body, query, param } = require("express-validator");
const {
  checkWallet,
  startOFACSync,
  startUNSync,
  addFIUINDEntry,
  getSyncJobHistory,
  getSanctionsStatistics,
  searchSanctions,
  checkWalletSanctions,
} = require("../controllers/sanctionsController");
const { authenticateToken } = require("../middlewares/auth");
const { auditLog } = require("../middlewares/audit");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

router.post(
  "/check-wallet",
  [
    body("walletAddress")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
    body("chain")
      .optional()
      .isString()
      .isIn(["BTC", "ETH", "LTC", "BCH", "XRP", "ADA", "DOT", "LINK"])
      .withMessage("Invalid chain specified"),
  ],
  auditLog,
  checkWallet
);

router.post("/sync/ofac", auditLog, startOFACSync);
router.post("/sync/un", auditLog, startUNSync);

router.post(
  "/fiu-ind",
  [
    body("entityName")
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Entity name is required and must be between 1 and 255 characters"),
    body("entityType")
      .optional()
      .isString()
      .isIn(["INDIVIDUAL", "ENTITY", "VESSEL", "AIRCRAFT", "WALLET", "EXCHANGE", "MIXER", "DARKNET"])
      .withMessage("Invalid entity type"),
    body("walletAddress")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
    body("chain")
      .optional()
      .isString()
      .isIn(["BTC", "ETH", "LTC", "BCH", "XRP", "ADA", "DOT", "LINK"])
      .withMessage("Invalid chain specified"),
    body("country")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Country must be less than 100 characters"),
    body("description")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description must be less than 1000 characters"),
    body("riskLevel")
      .optional()
      .isString()
      .isIn(["LOW", "MEDIUM", "HIGH"])
      .withMessage("Risk level must be LOW, MEDIUM, or HIGH"),
    body("metadata")
      .optional()
      .isObject()
      .withMessage("Metadata must be an object"),
  ],
  auditLog,
  addFIUINDEntry
);

router.get(
  "/sync/history",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  auditLog,
  getSyncJobHistory
);

router.get("/stats", auditLog, getSanctionsStatistics);

router.get(
  "/search",
  [
    query("query")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Search query is required and must be between 1 and 100 characters"),
    query("source")
      .optional()
      .isString()
      .isIn(["OFAC", "UN", "EU", "FIU_IND", "INTERNAL"])
      .withMessage("Invalid source specified"),
    query("entityType")
      .optional()
      .isString()
      .isIn(["INDIVIDUAL", "ENTITY", "VESSEL", "AIRCRAFT", "WALLET", "EXCHANGE", "MIXER", "DARKNET"])
      .withMessage("Invalid entity type"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  auditLog,
  searchSanctions
);

// Screen wallet for sanctions
router.get(
  "/screen/:address",
  [
    param("address")
      .isString()
      .trim()
      .isLength({ min: 26, max: 42 })
      .withMessage("Wallet address must be between 26 and 42 characters"),
  ],
  auditLog,
  async (req, res) => {
    try {
      const { address } = req.params;
      const result = await checkWalletSanctions(address);
      
      const sanctions = result.isSanctioned 
        ? result.matches.map(match => ({
            sanctionList: match.source,
            entityName: match.entityName,
            riskLevel: match.riskLevel,
            description: match.description,
          }))
        : [];
      
      res.json(sanctions);
    } catch (error) {
      console.error("Error screening wallet:", error);
      res.status(500).json({
        error: "Failed to screen wallet",
        message: error.message,
      });
    }
  }
);

module.exports = router;
