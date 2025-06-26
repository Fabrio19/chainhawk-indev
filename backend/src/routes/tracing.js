const express = require("express");
const { body, param, query } = require("express-validator");
const { asyncHandler } = require("../middlewares/error");
const {
  authMiddleware,
  requirePermission,
  requireAnalyst,
} = require("../middlewares/auth");
const {
  startTransactionTrace,
  getTraceResults,
  getTraceHistory,
  quickWalletCheck,
  getTracingStats,
  cancelTrace,
} = require("../controllers/tracingController");

const router = express.Router();

// All tracing routes require authentication
router.use(authMiddleware);

/**
 * POST /tracing/start - Start a new transaction trace
 * Body: { walletAddress, chain, depth? }
 */
router.post(
  "/start",
  requirePermission("transaction_tracing"),
  [
    body("walletAddress")
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid wallet address is required"),
    body("chain").notEmpty().withMessage("Chain is required"),
    body("depth").optional().isInt({ min: 1, max: 10 }),
  ],
  asyncHandler(startTransactionTrace),
);

/**
 * GET /tracing/:traceId - Get trace results
 */
router.get(
  "/:traceId",
  requirePermission("transaction_tracing"),
  [param("traceId").notEmpty().withMessage("Trace ID is required")],
  asyncHandler(getTraceResults),
);

/**
 * DELETE /tracing/:traceId - Cancel a pending trace
 */
router.delete(
  "/:traceId",
  requirePermission("transaction_tracing"),
  [param("traceId").notEmpty().withMessage("Trace ID is required")],
  asyncHandler(cancelTrace),
);

/**
 * GET /tracing/history - Get trace history
 * Query params: page, limit, status
 */
router.get(
  "/history",
  requirePermission("transaction_tracing"),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status")
      .optional()
      .isIn(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  ],
  asyncHandler(getTraceHistory),
);

/**
 * POST /tracing/quick-check - Quick wallet risk check
 * Body: { walletAddress, chain }
 */
router.post(
  "/quick-check",
  requirePermission("wallet_screening"),
  [
    body("walletAddress")
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid wallet address is required"),
    body("chain").notEmpty().withMessage("Chain is required"),
  ],
  asyncHandler(quickWalletCheck),
);

/**
 * GET /tracing/stats - Get tracing statistics
 * Query params: days
 */
router.get(
  "/stats",
  requireAnalyst,
  [query("days").optional().isInt({ min: 1, max: 365 })],
  asyncHandler(getTracingStats),
);

module.exports = router;
