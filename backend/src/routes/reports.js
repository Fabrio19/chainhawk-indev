const express = require("express");
const { query } = require("express-validator");
const {
  getReports,
  getReportById,
  generateReport,
  downloadReport,
  prepareReport,
} = require("../controllers/reportsController");
const { authenticateToken } = require("../middlewares/auth");
const { auditLog } = require("../middlewares/audit");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all reports
router.get(
  "/",
  [
    query("type")
      .optional()
      .isString()
      .isIn(["STR", "CTR", "SAR"])
      .withMessage("Invalid report type"),
    query("status")
      .optional()
      .isString()
      .isIn(["draft", "submitted", "accepted", "rejected"])
      .withMessage("Invalid status"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  auditLog,
  getReports
);

// Get report by ID
router.get(
  "/:id",
  auditLog,
  getReportById
);

// Generate new report
router.post(
  "/",
  auditLog,
  generateReport
);

// Prepare report template
router.post(
  "/prepare",
  auditLog,
  prepareReport
);

// Download report
router.get(
  "/:id/download",
  auditLog,
  downloadReport
);

module.exports = router; 