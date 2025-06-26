const express = require("express");
const { query, param } = require("express-validator");
const { asyncHandler } = require("../middlewares/error");
const {
  authMiddleware,
  requireAdmin,
  requireAnalyst,
} = require("../middlewares/auth");
const {
  getAuditLogs,
  getAuditLogStats,
  getUserAuditHistory,
  exportAuditLogs,
} = require("../controllers/auditController");

const router = express.Router();

// All audit routes require authentication
router.use(authMiddleware);

/**
 * GET /audit - Get audit logs with filtering
 * Query params: page, limit, userId, actionType, startDate, endDate, ipAddress, httpMethod
 * Requires: Admin or Analyst role
 */
router.get(
  "/",
  requireAnalyst,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("userId").optional().isUUID(),
    query("actionType").optional().trim().isLength({ min: 1 }),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("ipAddress").optional().isIP(),
    query("httpMethod")
      .optional()
      .isIn(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  ],
  asyncHandler(getAuditLogs),
);

/**
 * GET /audit/stats - Get audit log statistics
 * Query params: days (default: 7)
 * Requires: Admin or Analyst role
 */
router.get(
  "/stats",
  requireAnalyst,
  [query("days").optional().isInt({ min: 1, max: 365 })],
  asyncHandler(getAuditLogStats),
);

/**
 * GET /audit/user/:userId - Get audit history for specific user
 * Query params: page, limit, actionType
 * Requires: Admin role
 */
router.get(
  "/user/:userId",
  requireAdmin,
  [
    param("userId").isUUID().withMessage("Valid user ID is required"),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("actionType").optional().trim().isLength({ min: 1 }),
  ],
  asyncHandler(getUserAuditHistory),
);

/**
 * GET /audit/export - Export audit logs
 * Query params: startDate, endDate, format (json|csv)
 * Requires: Admin role
 */
router.get(
  "/export",
  requireAdmin,
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("format").optional().isIn(["json", "csv"]),
  ],
  asyncHandler(exportAuditLogs),
);

/**
 * GET /audit/my-activity - Get current user's audit history
 * Query params: page, limit, actionType
 */
router.get(
  "/my-activity",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("actionType").optional().trim().isLength({ min: 1 }),
  ],
  asyncHandler(async (req, res) => {
    // Delegate to getUserAuditHistory with current user's ID
    req.params.userId = req.user.sub;
    return getUserAuditHistory(req, res);
  }),
);

module.exports = router;
