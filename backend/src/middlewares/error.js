/**
 * Global error handling middleware
 * Catches all unhandled errors and returns consistent error responses
 */
const errorMiddleware = (error, req, res, next) => {
  console.error("🚨 Error occurred:", {
    message: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Prisma errors
  if (error.code && error.code.startsWith("P")) {
    return handlePrismaError(error, res);
  }

  // JWT errors (shouldn't reach here, but just in case)
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expired",
      code: "TOKEN_EXPIRED",
    });
  }

  // Validation errors
  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: error.details || error.message,
    });
  }

  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: error.retryAfter,
    });
  }

  // Default error response
  const status = error.status || error.statusCode || 500;
  const message =
    status === 500
      ? "Internal server error"
      : error.message || "An error occurred";

  res.status(status).json({
    error: message,
    code: error.code || "INTERNAL_ERROR",
    timestamp: new Date().toISOString(),
    requestId: req.id || "unknown",
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      details: error,
    }),
  });
};

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error, res) {
  switch (error.code) {
    case "P2002":
      // Unique constraint violation
      const field = error.meta?.target?.[0] || "field";
      return res.status(409).json({
        error: `${field} already exists`,
        code: "DUPLICATE_ENTRY",
        field: field,
      });

    case "P2025":
      // Record not found
      return res.status(404).json({
        error: "Record not found",
        code: "NOT_FOUND",
      });

    case "P2003":
      // Foreign key constraint failed
      return res.status(400).json({
        error: "Invalid reference to related record",
        code: "FOREIGN_KEY_CONSTRAINT",
      });

    case "P2014":
      // Required relation violation
      return res.status(400).json({
        error: "Required relation missing",
        code: "REQUIRED_RELATION_VIOLATION",
      });

    default:
      console.error("Unhandled Prisma error:", error);
      return res.status(500).json({
        error: "Database error",
        code: "DATABASE_ERROR",
      });
  }
}

/**
 * Async error wrapper - wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorMiddleware,
  asyncHandler,
};
