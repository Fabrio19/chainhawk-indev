const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const axios = require("axios");
const { Queue, Worker } = require("bullmq");

const prisma = new PrismaClient();

// Redis connection for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

// Create queue for webhook deliveries
const webhookQueue = new Queue("webhook-deliveries", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

/**
 * Webhook Service
 * Handles webhook registration, delivery, and management for exchange partnerships
 */

/**
 * Create a new webhook
 */
const createWebhook = async (userId, webhookData) => {
  const { name, url, events, secret } = webhookData;

  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    throw new Error("Invalid webhook URL");
  }

  // Generate secret if not provided
  const webhookSecret = secret || crypto.randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: {
      name,
      url,
      secret: webhookSecret,
      events: Array.isArray(events) ? events : [events],
      userId,
    },
  });

  return {
    ...webhook,
    secret: webhookSecret, // Return secret only once
  };
};

/**
 * Get webhooks for a user
 */
const getUserWebhooks = async (userId) => {
  return await prisma.webhook.findMany({
    where: { userId },
    include: {
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Update webhook
 */
const updateWebhook = async (webhookId, userId, updateData) => {
  const { name, url, events, isActive } = updateData;

  if (url) {
    try {
      new URL(url);
    } catch (error) {
      throw new Error("Invalid webhook URL");
    }
  }

  return await prisma.webhook.update({
    where: {
      id: webhookId,
      userId, // Ensure user owns the webhook
    },
    data: {
      ...(name && { name }),
      ...(url && { url }),
      ...(events && { events: Array.isArray(events) ? events : [events] }),
      ...(typeof isActive === "boolean" && { isActive }),
    },
  });
};

/**
 * Delete webhook
 */
const deleteWebhook = async (webhookId, userId) => {
  return await prisma.webhook.delete({
    where: {
      id: webhookId,
      userId, // Ensure user owns the webhook
    },
  });
};

/**
 * Generate webhook signature
 */
const generateSignature = (payload, secret) => {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
};

/**
 * Trigger webhook delivery
 */
const triggerWebhook = async (eventType, payload, webhookId = null) => {
  try {
    // Get active webhooks for this event type
    const where = {
      isActive: true,
      events: {
        array_contains: [eventType],
      },
    };

    if (webhookId) {
      where.id = webhookId;
    }

    const webhooks = await prisma.webhook.findMany({ where });

    if (webhooks.length === 0) {
      console.log(`No active webhooks found for event: ${eventType}`);
      return;
    }

    // Add webhook delivery jobs to queue
    const jobs = webhooks.map((webhook) => ({
      name: "deliver-webhook",
      data: {
        webhookId: webhook.id,
        eventType,
        payload,
        url: webhook.url,
        secret: webhook.secret,
      },
      opts: {
        jobId: `webhook-${webhook.id}-${Date.now()}`,
        delay: 0,
      },
    }));

    await webhookQueue.addBulk(jobs);

    console.log(`Triggered ${webhooks.length} webhooks for event: ${eventType}`);
  } catch (error) {
    console.error("Error triggering webhooks:", error);
  }
};

/**
 * Process webhook delivery (worker function)
 */
const processWebhookDelivery = async (job) => {
  const { webhookId, eventType, payload, url, secret } = job.data;
  const startTime = Date.now();

  try {
    // Generate signature
    const signature = generateSignature(payload, secret);

    // Prepare webhook payload
    const webhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    // Send webhook
    const response = await axios.post(url, webhookPayload, {
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "User-Agent": "CryptoCompliance-Webhook/1.0",
      },
      timeout: 10000, // 10 second timeout
    });

    const duration = Date.now() - startTime;

    // Record successful delivery
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType,
        payload,
        responseStatus: response.status,
        responseBody: response.data,
        duration,
        success: true,
      },
    });

    // Update webhook last triggered
    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        lastTriggered: new Date(),
        failureCount: 0, // Reset failure count on success
      },
    });

    console.log(`✅ Webhook delivered successfully: ${url} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error.response?.data || error.message;

    // Record failed delivery
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType,
        payload,
        responseStatus: error.response?.status,
        responseBody: error.response?.data,
        duration,
        success: false,
        errorMessage,
      },
    });

    // Increment failure count
    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: {
          increment: 1,
        },
      },
    });

    console.error(`❌ Webhook delivery failed: ${url} - ${errorMessage}`);
    throw error; // Re-throw to trigger retry
  }
};

/**
 * Get webhook delivery history
 */
const getWebhookDeliveries = async (webhookId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.webhookDelivery.count({ where: { webhookId } }),
  ]);

  return {
    deliveries,
    pagination: {
      page: parseInt(page),
      limit: take,
      total,
      pages: Math.ceil(total / take),
    },
  };
};

/**
 * Get webhook statistics
 */
const getWebhookStats = async (userId) => {
  const webhooks = await prisma.webhook.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          deliveries: true,
        },
      },
    },
  });

  const totalDeliveries = await prisma.webhookDelivery.count({
    where: {
      webhook: {
        userId,
      },
    },
  });

  const successfulDeliveries = await prisma.webhookDelivery.count({
    where: {
      webhook: {
        userId,
      },
      success: true,
    },
  });

  return {
    totalWebhooks: webhooks.length,
    activeWebhooks: webhooks.filter((w) => w.isActive).length,
    totalDeliveries,
    successfulDeliveries,
    successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
    webhooks: webhooks.map((webhook) => ({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      isActive: webhook.isActive,
      deliveryCount: webhook._count.deliveries,
      lastTriggered: webhook.lastTriggered,
      failureCount: webhook.failureCount,
    })),
  };
};

/**
 * Start webhook worker
 */
const startWebhookWorker = () => {
  const worker = new Worker(
    "webhook-deliveries",
    async (job) => {
      await processWebhookDelivery(job);
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process 5 webhooks concurrently
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Webhook job completed: ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Webhook job failed: ${job.id} - ${err.message}`);
  });

  return worker;
};

module.exports = {
  createWebhook,
  getUserWebhooks,
  updateWebhook,
  deleteWebhook,
  triggerWebhook,
  getWebhookDeliveries,
  getWebhookStats,
  startWebhookWorker,
  generateSignature,
}; 