const { PrismaClient } = require("@prisma/client");
const { validationResult } = require("express-validator");

const prisma = new PrismaClient();

/**
 * Audit Log Controller
 * Handles audit log viewing and statistics
 */

/**
 * Get audit logs with filtering and pagination
 * GET /audit
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      actionType,
      startDate,
      endDate,
      ipAddress,
      httpMethod,
    } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Build filter conditions
    const where = {};
    if (userId) where.userId = userId;
    if (actionType) where.actionType = actionType;
    if (ipAddress) where.ipAddress = { contains: ipAddress };
    if (httpMethod) where.httpMethod = httpMethod;

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
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
          apiKey: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      auditLogs,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "AUDIT_LOGS_FETCH_FAILED",
    });
  }
};

/**
 * Get audit log statistics
 * GET /audit/stats
 */
const getAuditLogStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get various statistics
    const [
      totalLogs,
      recentLogs,
      topActions,
      topUsers,
      averageResponseTime,
      errorCount,
      dailyActivity,
    ] = await Promise.all([
      // Total logs
      prisma.auditLog.count(),

      // Recent logs (within specified days)
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // Top action types
      prisma.auditLog.groupBy({
        by: ["actionType"],
        _count: {
          actionType: true,
        },
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          _count: {
            actionType: "desc",
          },
        },
        take: 10,
      }),

      // Top users by activity
      prisma.auditLog.groupBy({
        by: ["userId"],
        _count: {
          userId: true,
        },
        where: {
          userId: {
            not: null,
          },
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          _count: {
            userId: "desc",
          },
        },
        take: 10,
      }),

      // Average response time
      prisma.auditLog.aggregate({
        _avg: {
          duration: true,
        },
        where: {
          duration: {
            not: null,
          },
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // Error count (status >= 400)
      prisma.auditLog.count({
        where: {
          responseStatus: {
            gte: 400,
          },
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // Daily activity (last 7 days)
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM audit_log 
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 7
      `,
    ]);

    // Get user details for top users
    const topUserIds = topUsers.map((u) => u.userId);
    const userDetails = await prisma.user.findMany({
      where: {
        id: {
          in: topUserIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Combine user details with activity counts
    const topUsersWithDetails = topUsers.map((userActivity) => {
      const user = userDetails.find((u) => u.id === userActivity.userId);
      return {
        user,
        count: userActivity._count.userId,
      };
    });

    res.json({
      totalLogs,
      recentLogs,
      averageResponseTime: Math.round(averageResponseTime._avg.duration || 0),
      errorCount,
      errorRate: ((errorCount / recentLogs) * 100).toFixed(2),
      topActions: topActions.map((action) => ({
        actionType: action.actionType,
        count: action._count.actionType,
      })),
      topUsers: topUsersWithDetails,
      dailyActivity: dailyActivity.map((day) => ({
        date: day.date,
        count: parseInt(day.count),
      })),
      period: {
        days: parseInt(days),
        startDate,
        endDate: new Date(),
      },
    });
  } catch (error) {
    console.error("Get audit stats error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "AUDIT_STATS_FAILED",
    });
  }
};

/**
 * Get user's audit history
 * GET /audit/user/:userId
 */
const getUserAuditHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, actionType } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = { userId };
    if (actionType) where.actionType = actionType;

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          apiKey: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      auditLogs,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Get user audit history error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "USER_AUDIT_HISTORY_FAILED",
    });
  }
};

/**
 * Export audit logs (admin only)
 * GET /audit/export
 */
const exportAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate, format = "json" } = req.query;

    // Build filter conditions
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const auditLogs = await prisma.auditLog.findMany({
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
        apiKey: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10000, // Limit export to 10k records
    });

    if (format === "csv") {
      // Convert to CSV format
      const csv = [
        "Timestamp,User,Email,Action,Endpoint,Method,Status,IP,Duration",
        ...auditLogs.map((log) =>
          [
            log.createdAt.toISOString(),
            log.user?.name || "API Key",
            log.user?.email || log.apiKey?.name || "Unknown",
            log.actionType,
            log.endpoint,
            log.httpMethod,
            log.responseStatus,
            log.ipAddress,
            log.duration || 0,
          ].join(","),
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=audit-logs-${new Date().toISOString().split("T")[0]}.csv`,
      );
      res.send(csv);
    } else {
      // Return JSON format
      res.json({
        auditLogs,
        exported: auditLogs.length,
        exportedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Export audit logs error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "AUDIT_EXPORT_FAILED",
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogStats,
  getUserAuditHistory,
  exportAuditLogs,
};
