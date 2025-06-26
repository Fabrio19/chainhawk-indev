const {
  verifyJWT,
  verifyApiKey,
  hasPermission,
  getUserById,
} = require("../services/authService");

/**
 * JWT and API Key Authentication Middleware
 * Verifies JWT tokens and API keys for protected routes
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];

    let user = null;
    let apiKey = null;
    let authMethod = null;

    // Check for JWT token first
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const decoded = verifyJWT(token);
        const userFromDB = await getUserById(decoded.sub);

        req.user = decoded;
        req.user.fullUser = userFromDB;
        authMethod = "JWT";
      } catch (error) {
        return res.status(401).json({
          error: error.message || "Invalid or expired token",
          code: "INVALID_TOKEN",
        });
      }
    }
    // Check for API key if no JWT token
    else if (apiKeyHeader) {
      try {
        const result = await verifyApiKey(apiKeyHeader);
        user = result.user;
        apiKey = result.apiKey;

        req.user = {
          sub: user.id,
          role: user.role,
          email: user.email,
          fullUser: user,
        };
        req.apiKey = apiKey;
        authMethod = "API_KEY";
      } catch (error) {
        return res.status(401).json({
          error: error.message || "Invalid API key",
          code: "INVALID_API_KEY",
        });
      }
    } else {
      return res.status(401).json({
        error: "Authentication required",
        code: "NO_AUTH_PROVIDED",
      });
    }

    req.authMethod = authMethod;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      error: "Authentication service error",
      code: "AUTH_SERVICE_ERROR",
    });
  }
};

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "FORBIDDEN",
        requiredRoles: roles,
        userRole,
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware factory
 * Creates middleware that checks if user has required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const user = req.user.fullUser || req.user;
    const apiKey = req.apiKey;

    if (!hasPermission(user, apiKey, permission)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "FORBIDDEN",
        requiredPermission: permission,
        userRole: user.role,
      });
    }

    next();
  };
};

/**
 * Admin only middleware
 */
const requireAdmin = requireRole("admin");

/**
 * Admin or Analyst middleware
 */
const requireAnalyst = requireRole(["admin", "analyst"]);

/**
 * Optional authentication middleware
 * Adds user info if authenticated, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];

    // Try JWT token first
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyJWT(token);
        const userFromDB = await getUserById(decoded.sub);
        req.user = decoded;
        req.user.fullUser = userFromDB;
        req.authMethod = "JWT";
      } catch (error) {
        // Ignore authentication errors for optional auth
      }
    }
    // Try API key
    else if (apiKeyHeader) {
      try {
        const result = await verifyApiKey(apiKeyHeader);
        req.user = {
          sub: result.user.id,
          role: result.user.role,
          email: result.user.email,
          fullUser: result.user,
        };
        req.apiKey = result.apiKey;
        req.authMethod = "API_KEY";
      } catch (error) {
        // Ignore authentication errors for optional auth
      }
    }

    next();
  } catch (error) {
    // For optional auth, continue even if there's an error
    next();
  }
};

module.exports = {
  authMiddleware,
  authenticateToken: authMiddleware,
  requireRole,
  requirePermission,
  requireAdmin,
  requireAnalyst,
  optionalAuth,
};
