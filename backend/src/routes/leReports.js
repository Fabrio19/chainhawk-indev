const express = require("express");
const { body, param, query } = require("express-validator");
const { asyncHandler } = require("../middlewares/error");
const {
  authMiddleware,
  requirePermission,
  requireAnalyst,
} = require("../middlewares/auth");
const {
  generateCaseReport,
  generateEvidenceChainReportHandler,
  generateRegulatoryReportHandler,
  getCaseReports,
  downloadReport,
  updateReportStatus,
  getAllReports,
  generateLEReport,
} = require("../controllers/leReportController");

const router = express.Router();

// All LE Report routes require authentication
router.use(authMiddleware);

/**
 * POST /le-reports/case/:caseId - Generate Law Enforcement Case Report
 * Body: { reportType? }
 */
router.post(
  "/case/:caseId",
  requirePermission("le_reports"),
  [
    param("caseId").isUUID().withMessage("Valid case ID is required"),
    body("reportType")
      .optional()
      .isString()
      .isIn(["FULL", "SUMMARY", "EVIDENCE_CHAIN"])
      .withMessage("Valid report type is required"),
  ],
  asyncHandler(generateCaseReport),
);

/**
 * POST /le-reports/evidence-chain/:caseId - Generate Evidence Chain Report
 */
router.post(
  "/evidence-chain/:caseId",
  requirePermission("le_reports"),
  [
    param("caseId").isUUID().withMessage("Valid case ID is required"),
  ],
  asyncHandler(generateEvidenceChainReportHandler),
);

/**
 * POST /le-reports/regulatory - Generate Regulatory Compliance Report
 * Body: { startDate, endDate, regulator? }
 */
router.post(
  "/regulatory",
  requirePermission("le_reports"),
  [
    body("startDate")
      .isISO8601()
      .withMessage("Valid start date is required"),
    body("endDate")
      .isISO8601()
      .withMessage("Valid end date is required"),
    body("regulator")
      .optional()
      .isString()
      .isIn(["FIU-IND", "FATF", "OFAC", "EU", "UN"])
      .withMessage("Valid regulator is required"),
  ],
  asyncHandler(generateRegulatoryReportHandler),
);

/**
 * GET /le-reports/case/:caseId - Get LE Reports for a case
 * Query: page?, limit?
 */
router.get(
  "/case/:caseId",
  requirePermission("le_reports"),
  [
    param("caseId").isUUID().withMessage("Valid case ID is required"),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  asyncHandler(getCaseReports),
);

/**
 * GET /le-reports/:reportId/download - Download LE Report PDF
 */
router.get(
  "/:reportId/download",
  requirePermission("le_reports"),
  [
    param("reportId").isUUID().withMessage("Valid report ID is required"),
  ],
  asyncHandler(downloadReport),
);

/**
 * PUT /le-reports/:reportId/status - Update report status
 * Body: { status, sentTo?, notes? }
 */
router.put(
  "/:reportId/status",
  requirePermission("le_reports"),
  [
    param("reportId").isUUID().withMessage("Valid report ID is required"),
    body("status")
      .isString()
      .isIn(["GENERATED", "SENT", "ARCHIVED"])
      .withMessage("Valid status is required"),
    body("sentTo")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Sent to must be between 1 and 200 characters"),
    body("notes")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Notes must be less than 1000 characters"),
  ],
  asyncHandler(updateReportStatus),
);

/**
 * GET /le-reports - Get all LE Reports (admin only)
 * Query: page?, limit?, status?, reportType?
 */
router.get(
  "/",
  requireAnalyst,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status")
      .optional()
      .isString()
      .isIn(["GENERATED", "SENT", "ARCHIVED"])
      .withMessage("Valid status is required"),
    query("reportType")
      .optional()
      .isString()
      .isIn(["FULL", "SUMMARY", "EVIDENCE_CHAIN", "REGULATORY_COMPLIANCE"])
      .withMessage("Valid report type is required"),
  ],
  asyncHandler(getAllReports),
);

/**
 * POST /le-reports/generate - Generate new Law Enforcement report
 */
router.post(
  "/generate",
  requirePermission("le_reports"),
  asyncHandler(generateLEReport),
);

module.exports = router; 