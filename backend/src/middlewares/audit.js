const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Audit logging middleware - logs all API requests to database
 * This is required for FIU-IND compliance and tracks all system access
 */
const auditMiddleware = async (req, res, next) => {
  // Skip audit logging for health checks and static files
  if (req.path === "/health" || req.path.startsWith("/static/")) {
    return next();
  }

  // Skip if audit logging is disabled
  if (process.env.ENABLE_AUDIT_LOGGING !== "true") {
    return next();
  }

  const startTime = Date.now();

  // Get IP address (handle proxy scenarios)
  const getClientIP = (req) => {
    return (
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      "unknown"
    );
  };

  // Store original response.json and response.end to capture response
  const originalJson = res.json;
  const originalEnd = res.end;
  let responseData = null;

  // Override res.json to capture response data
  res.json = function (data) {
    responseData = data;
    return originalJson.call(this, data);
  };

  // Override res.end to ensure we log even if json() isn't called
  res.end = function (...args) {
    if (args[0] && !responseData) {
      try {
        responseData = JSON.parse(args[0]);
      } catch (e) {
        responseData = args[0];
      }
    }
    return originalEnd.apply(this, args);
  };

  // Extract user info from JWT token or API key
  let userId = null;
  let apiKeyId = null;

  try {
    // Check for JWT token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const jwt = require("jsonwebtoken");
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.sub;
    }

    // Check for API key
    const apiKeyHeader = req.headers["x-api-key"];
    if (apiKeyHeader) {
      // In a real implementation, you'd look up the API key in the database
      // For now, we'll set a placeholder
      apiKeyId = "api-key-placeholder";
    }
  } catch (error) {
    // Ignore auth errors in audit middleware - let auth middleware handle them
  }

  // Wait for response to complete
  res.on("finish", async () => {
    try {
      const duration = Date.now() - startTime;

      // Determine action type based on endpoint
      const actionType = getActionType(req.method, req.path);

      // Prepare request payload (sanitize sensitive data)
      let requestPayload = null;
      if (req.body && Object.keys(req.body).length > 0) {
        requestPayload = sanitizeRequestPayload(req.body, req.path);
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          userId: userId,
          apiKeyId: apiKeyId,
          actionType: actionType,
          endpoint: req.path,
          httpMethod: req.method,
          requestPayload: requestPayload,
          responseStatus: res.statusCode,
          ipAddress: getClientIP(req),
          userAgent: req.headers["user-agent"] || null,
          duration: duration,
        },
      });

      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📋 Audit: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms) - User: ${userId || "anonymous"} - IP: ${getClientIP(req)}`,
        );
      }
    } catch (error) {
      console.error("❌ Audit logging failed:", error);
      // Don't let audit logging errors break the API response
    }
  });

  next();
};

/**
 * Determine action type based on HTTP method and endpoint
 */
function getActionType(method, path) {
  // Authentication actions
  if (path.includes("/auth/login")) return "auth_login";
  if (path.includes("/auth/register")) return "auth_register";
  if (path.includes("/auth/logout")) return "auth_logout";
  if (path.includes("/auth/api-key")) return "api_key_management";

  // User management
  if (path.includes("/users") && method === "GET") return "user_list";
  if (path.includes("/users") && method === "POST") return "user_create";
  if (path.includes("/users") && method === "PUT") return "user_update";
  if (path.includes("/users") && method === "DELETE") return "user_delete";

  // Compliance actions (will be added in future steps)
  if (path.includes("/compliance/wallet-screen")) return "wallet_screening";
  if (path.includes("/compliance/transaction-trace"))
    return "transaction_tracing";
  if (path.includes("/compliance/sanction-check")) return "sanction_screening";
  if (path.includes("/compliance/report")) return "report_generation";

  // Audit log access
  if (path.includes("/audit")) return "audit_log_access";

  // Default action type
  return `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

/**
 * Sanitize request payload to remove sensitive data
 */
function sanitizeRequestPayload(payload, endpoint) {
  if (process.env.LOG_SENSITIVE_DATA === "false") {
    const sanitized = { ...payload };

    // Remove sensitive fields
    const sensitiveFields = [
      "password",
      "passwordHash",
      "apiKey",
      "apiKeyHash",
      "token",
      "secret",
      "privateKey",
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    });

    // For auth endpoints, be extra careful
    if (endpoint.includes("/auth/")) {
      return { endpoint: endpoint, action: "auth_operation" };
    }

    return sanitized;
  }

  return payload;
}

module.exports = {
  auditLog: auditMiddleware,
};
