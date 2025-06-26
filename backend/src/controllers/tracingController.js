const { validationResult } = require("express-validator");
const {
  startTrace,
  getTrace,
  getUserTraces,
  analyzeWalletRisk,
  getTracingQueue,
} = require("../services/tracingService");
const { checkWalletSanctions } = require("../services/sanctionsService");

/**
 * Tracing Controller
 * Handles transaction tracing and wallet risk analysis
 */

/**
 * Start a new transaction trace
 * POST /tracing/start
 */
const startTransactionTrace = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { walletAddress, chain, depth = 5 } = req.body;
    const userId = req.user.sub;

    // Start the trace
    const traceJob = await startTrace(walletAddress, chain, depth, userId);

    res.status(202).json({
      message: "Transaction trace started",
      trace: traceJob,
    });
  } catch (error) {
    console.error("Start trace error:", error);
    res.status(500).json({
      error: "Failed to start transaction trace",
      code: "TRACE_START_FAILED",
    });
  }
};

/**
 * Get trace results
 * GET /tracing/:traceId
 */
const getTraceResults = async (req, res) => {
  try {
    const { traceId } = req.params;

    const trace = await getTrace(traceId);

    if (!trace) {
      return res.status(404).json({
        error: "Trace not found",
        code: "TRACE_NOT_FOUND",
      });
    }

    // Check if user has access to this trace
    if (trace.requestedBy !== req.user.sub && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    res.json({
      trace,
    });
  } catch (error) {
    console.error("Get trace error:", error);
    res.status(500).json({
      error: "Failed to get trace results",
      code: "TRACE_GET_FAILED",
    });
  }
};

/**
 * Get user's trace history
 * GET /tracing/history
 */
const getTraceHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const userId = req.user.sub;

    let traces;
    if (req.user.role === "admin") {
      // Admin can see all traces
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      const skip = (page - 1) * limit;
      const take = parseInt(limit);

      const where = {};
      if (status) where.status = status;

      traces = await prisma.transactionTrace.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });
    } else {
      // Regular users see only their traces
      traces = await getUserTraces(userId, parseInt(limit));
    }

    res.json({
      traces,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: traces.length,
      },
    });
  } catch (error) {
    console.error("Get trace history error:", error);
    res.status(500).json({
      error: "Failed to get trace history",
      code: "TRACE_HISTORY_FAILED",
    });
  }
};

/**
 * Quick wallet risk check (without full trace)
 * POST /tracing/quick-check
 */
const quickWalletCheck = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { walletAddress, chain } = req.body;

    // Check sanctions first
    const sanctionsResult = await checkWalletSanctions(walletAddress, chain);

    // Quick risk analysis
    const riskAnalysis = await analyzeWalletRisk(walletAddress, chain);

    res.json({
      walletAddress,
      chain,
      sanctions: sanctionsResult,
      riskAnalysis,
      quickCheck: true,
      checkedAt: new Date(),
    });
  } catch (error) {
    console.error("Quick wallet check error:", error);
    res.status(500).json({
      error: "Failed to check wallet",
      code: "WALLET_CHECK_FAILED",
    });
  }
};

/**
 * Get tracing statistics
 * GET /tracing/stats
 */
const getTracingStats = async (req, res) => {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [
      totalTraces,
      recentTraces,
      completedTraces,
      failedTraces,
      averageRisk,
      highRiskTraces,
    ] = await Promise.all([
      prisma.transactionTrace.count(),
      prisma.transactionTrace.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.transactionTrace.count({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.transactionTrace.count({
        where: {
          status: "FAILED",
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.transactionTrace.aggregate({
        _avg: {
          riskLevel: true,
        },
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.transactionTrace.count({
        where: {
          riskLevel: {
            gte: 0.7,
          },
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
          },
        },
      }),
    ]);

    res.json({
      totalTraces,
      recentTraces,
      completedTraces,
      failedTraces,
      averageRisk: averageRisk._avg.riskLevel || 0,
      highRiskTraces,
      successRate:
        recentTraces > 0 ? (completedTraces / recentTraces) * 100 : 0,
      period: {
        days: parseInt(days),
        startDate,
        endDate: new Date(),
      },
    });
  } catch (error) {
    console.error("Get tracing stats error:", error);
    res.status(500).json({
      error: "Failed to get tracing statistics",
      code: "TRACING_STATS_FAILED",
    });
  }
};

/**
 * Cancel a pending trace
 * DELETE /tracing/:traceId
 */
const cancelTrace = async (req, res) => {
  try {
    const { traceId } = req.params;
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const trace = await prisma.transactionTrace.findUnique({
      where: { traceId },
    });

    if (!trace) {
      return res.status(404).json({
        error: "Trace not found",
        code: "TRACE_NOT_FOUND",
      });
    }

    // Check if user has access to this trace
    if (trace.requestedBy !== req.user.sub && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    if (trace.status !== "PENDING" && trace.status !== "PROCESSING") {
      return res.status(400).json({
        error: "Cannot cancel completed or failed trace",
        code: "CANNOT_CANCEL",
      });
    }

    // Update trace status
    await prisma.transactionTrace.update({
      where: { traceId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        riskFlags: [
          {
            type: "TRACE_CANCELLED",
            severity: "LOW",
            description: "Trace was cancelled by user",
          },
        ],
      },
    });

    // Remove job from queue
    try {
      await getTracingQueue().remove(traceId);
    } catch (queueError) {
      console.warn("Failed to remove job from queue:", queueError);
    }

    res.json({
      message: "Trace cancelled successfully",
      traceId,
    });
  } catch (error) {
    console.error("Cancel trace error:", error);
    res.status(500).json({
      error: "Failed to cancel trace",
      code: "TRACE_CANCEL_FAILED",
    });
  }
};

module.exports = {
  startTransactionTrace,
  getTraceResults,
  getTraceHistory,
  quickWalletCheck,
  getTracingStats,
  cancelTrace,
};
