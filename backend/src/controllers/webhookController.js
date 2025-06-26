const { validationResult } = require("express-validator");
const {
  createWebhook,
  getUserWebhooks,
  updateWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  getWebhookStats,
} = require("../services/webhookService");

/**
 * Webhook Controller
 * Handles webhook management for exchange partnerships
 */

/**
 * Create a new webhook
 * POST /webhooks
 */
const createWebhookHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { name, url, events, secret } = req.body;
    const userId = req.user.sub;

    const webhook = await createWebhook(userId, {
      name,
      url,
      events,
      secret,
    });

    res.status(201).json({
      message: "Webhook created successfully",
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret, // Return secret only once
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
    });
  } catch (error) {
    console.error("Create webhook error:", error);
    res.status(500).json({
      error: "Failed to create webhook",
      code: "WEBHOOK_CREATION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get user's webhooks
 * GET /webhooks
 */
const getUserWebhooksHandler = async (req, res) => {
  try {
    const userId = req.user.sub;
    const webhooks = await getUserWebhooks(userId);

    // Remove sensitive data
    const sanitizedWebhooks = webhooks.map((webhook) => ({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      lastTriggered: webhook.lastTriggered,
      failureCount: webhook.failureCount,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
      deliveries: webhook.deliveries.map((delivery) => ({
        id: delivery.id,
        eventType: delivery.eventType,
        success: delivery.success,
        responseStatus: delivery.responseStatus,
        duration: delivery.duration,
        createdAt: delivery.createdAt,
      })),
    }));

    res.json({
      webhooks: sanitizedWebhooks,
    });
  } catch (error) {
    console.error("Get webhooks error:", error);
    res.status(500).json({
      error: "Failed to get webhooks",
      code: "WEBHOOKS_FETCH_FAILED",
    });
  }
};

/**
 * Update webhook
 * PUT /webhooks/:id
 */
const updateWebhookHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const userId = req.user.sub;
    const updateData = req.body;

    const webhook = await updateWebhook(id, userId, updateData);

    res.json({
      message: "Webhook updated successfully",
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        updatedAt: webhook.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update webhook error:", error);
    res.status(500).json({
      error: "Failed to update webhook",
      code: "WEBHOOK_UPDATE_FAILED",
      details: error.message,
    });
  }
};

/**
 * Delete webhook
 * DELETE /webhooks/:id
 */
const deleteWebhookHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    await deleteWebhook(id, userId);

    res.json({
      message: "Webhook deleted successfully",
    });
  } catch (error) {
    console.error("Delete webhook error:", error);
    res.status(500).json({
      error: "Failed to delete webhook",
      code: "WEBHOOK_DELETION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get webhook delivery history
 * GET /webhooks/:id/deliveries
 */
const getWebhookDeliveriesHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.sub;

    // Verify webhook ownership
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    
    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!webhook) {
      return res.status(404).json({
        error: "Webhook not found",
        code: "WEBHOOK_NOT_FOUND",
      });
    }

    const result = await getWebhookDeliveries(id, page, limit);

    res.json(result);
  } catch (error) {
    console.error("Get webhook deliveries error:", error);
    res.status(500).json({
      error: "Failed to get webhook deliveries",
      code: "WEBHOOK_DELIVERIES_FETCH_FAILED",
    });
  }
};

/**
 * Get webhook statistics
 * GET /webhooks/stats
 */
const getWebhookStatsHandler = async (req, res) => {
  try {
    const userId = req.user.sub;
    const stats = await getWebhookStats(userId);

    res.json(stats);
  } catch (error) {
    console.error("Get webhook stats error:", error);
    res.status(500).json({
      error: "Failed to get webhook statistics",
      code: "WEBHOOK_STATS_FETCH_FAILED",
    });
  }
};

/**
 * Test webhook (send test event)
 * POST /webhooks/:id/test
 */
const testWebhookHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    // Verify webhook ownership
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    
    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!webhook) {
      return res.status(404).json({
        error: "Webhook not found",
        code: "WEBHOOK_NOT_FOUND",
      });
    }

    // Trigger test event
    const { triggerWebhook } = require("../services/webhookService");
    await triggerWebhook("test", {
      message: "This is a test webhook event",
      timestamp: new Date().toISOString(),
      webhookId: id,
    }, id);

    res.json({
      message: "Test webhook triggered successfully",
      webhookId: id,
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    res.status(500).json({
      error: "Failed to test webhook",
      code: "WEBHOOK_TEST_FAILED",
      details: error.message,
    });
  }
};

module.exports = {
  createWebhookHandler,
  getUserWebhooksHandler,
  updateWebhookHandler,
  deleteWebhookHandler,
  getWebhookDeliveriesHandler,
  getWebhookStatsHandler,
  testWebhookHandler,
}; 