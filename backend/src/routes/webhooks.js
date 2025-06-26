const express = require("express");
const { body, param, query } = require("express-validator");
const { asyncHandler } = require("../middlewares/error");
const {
  authMiddleware,
  requirePermission,
} = require("../middlewares/auth");
const {
  createWebhookHandler,
  getUserWebhooksHandler,
  updateWebhookHandler,
  deleteWebhookHandler,
  getWebhookDeliveriesHandler,
  getWebhookStatsHandler,
  testWebhookHandler,
} = require("../controllers/webhookController");

const router = express.Router();

// All webhook routes require authentication
router.use(authMiddleware);

/**
 * POST /webhooks - Create a new webhook
 * Body: { name, url, events, secret? }
 */
router.post(
  "/",
  requirePermission("webhook_management"),
  [
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Webhook name is required and must be between 1 and 100 characters"),
    body("url")
      .isURL()
      .withMessage("Valid webhook URL is required"),
    body("events")
      .isArray({ min: 1 })
      .withMessage("At least one event type is required"),
    body("events.*")
      .isString()
      .isIn([
        "wallet_screened",
        "sanction_hit",
        "high_risk_transaction",
        "case_created",
        "case_updated",
        "str_generated",
        "test",
      ])
      .withMessage("Invalid event type"),
    body("secret")
      .optional()
      .isString()
      .isLength({ min: 32 })
      .withMessage("Secret must be at least 32 characters"),
  ],
  asyncHandler(createWebhookHandler),
);

/**
 * GET /webhooks - Get user's webhooks
 */
router.get(
  "/",
  requirePermission("webhook_management"),
  asyncHandler(getUserWebhooksHandler),
);

/**
 * PUT /webhooks/:id - Update webhook
 * Body: { name?, url?, events?, isActive? }
 */
router.put(
  "/:id",
  requirePermission("webhook_management"),
  [
    param("id").isUUID().withMessage("Valid webhook ID is required"),
    body("name")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Webhook name must be between 1 and 100 characters"),
    body("url")
      .optional()
      .isURL()
      .withMessage("Valid webhook URL is required"),
    body("events")
      .optional()
      .isArray({ min: 1 })
      .withMessage("At least one event type is required"),
    body("events.*")
      .optional()
      .isString()
      .isIn([
        "wallet_screened",
        "sanction_hit",
        "high_risk_transaction",
        "case_created",
        "case_updated",
        "str_generated",
        "test",
      ])
      .withMessage("Invalid event type"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ],
  asyncHandler(updateWebhookHandler),
);

/**
 * DELETE /webhooks/:id - Delete webhook
 */
router.delete(
  "/:id",
  requirePermission("webhook_management"),
  [
    param("id").isUUID().withMessage("Valid webhook ID is required"),
  ],
  asyncHandler(deleteWebhookHandler),
);

/**
 * GET /webhooks/:id/deliveries - Get webhook delivery history
 * Query: page?, limit?
 */
router.get(
  "/:id/deliveries",
  requirePermission("webhook_management"),
  [
    param("id").isUUID().withMessage("Valid webhook ID is required"),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  asyncHandler(getWebhookDeliveriesHandler),
);

/**
 * GET /webhooks/stats - Get webhook statistics
 */
router.get(
  "/stats",
  requirePermission("webhook_management"),
  asyncHandler(getWebhookStatsHandler),
);

/**
 * POST /webhooks/:id/test - Test webhook (send test event)
 */
router.post(
  "/:id/test",
  requirePermission("webhook_management"),
  [
    param("id").isUUID().withMessage("Valid webhook ID is required"),
  ],
  asyncHandler(testWebhookHandler),
);

module.exports = router; 