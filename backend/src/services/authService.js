const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Authentication Service
 * Handles JWT and API key authentication logic
 */

/**
 * Verify JWT token
 */
const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

/**
 * Generate JWT token for user
 */
const generateJWT = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "8h" },
  );
};

/**
 * Verify API key and get associated user
 */
const verifyApiKey = async (apiKey) => {
  if (!apiKey) {
    throw new Error("API key is required");
  }

  // Hash the provided API key
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  // Find API key record
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: {
      keyHash,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (!apiKeyRecord) {
    throw new Error("Invalid API key");
  }

  if (!apiKeyRecord.isActive) {
    throw new Error("API key is inactive");
  }

  if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
    throw new Error("API key has expired");
  }

  if (apiKeyRecord.user.status !== "active") {
    throw new Error("User account is suspended");
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsed: new Date() },
  });

  return {
    user: apiKeyRecord.user,
    apiKey: apiKeyRecord,
  };
};

/**
 * Generate secure API key
 */
const generateApiKey = (length = 64) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Hash API key for storage
 */
const hashApiKey = (apiKey) => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};

/**
 * Check if user has required permission
 */
const hasPermission = (user, apiKey, requiredPermission) => {
  // Admin users have all permissions
  if (user.role === "admin") {
    return true;
  }

  // Check API key permissions if using API key auth
  if (apiKey && apiKey.permissions) {
    const permissions = Array.isArray(apiKey.permissions)
      ? apiKey.permissions
      : JSON.parse(apiKey.permissions);
    return permissions.includes(requiredPermission);
  }

  // Default role-based permissions
  const rolePermissions = {
    admin: ["*"], // All permissions
    analyst: [
      "wallet_screening",
      "transaction_tracing",
      "compliance_screening",
      "case_management",
      "reporting",
    ],
    partner: ["wallet_screening", "transaction_tracing"],
  };

  const userPermissions = rolePermissions[user.role] || [];
  return (
    userPermissions.includes("*") ||
    userPermissions.includes(requiredPermission)
  );
};

/**
 * Get user by ID with permission checks
 */
const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status !== "active") {
    throw new Error("User account is suspended");
  }

  return user;
};

/**
 * Rate limiting helper
 */
const checkRateLimit = async (identifier, action) => {
  const key = `rate_limit:${action}:${identifier}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // Max requests per window

  // This is a simple in-memory rate limiting
  // In production, use Redis for distributed rate limiting
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing requests for this identifier
  const requests = global.rateLimitStore.get(key) || [];

  // Filter out old requests
  const recentRequests = requests.filter((time) => time > windowStart);

  if (recentRequests.length >= maxRequests) {
    throw new Error("Rate limit exceeded");
  }

  // Add current request
  recentRequests.push(now);
  global.rateLimitStore.set(key, recentRequests);

  return {
    remaining: maxRequests - recentRequests.length,
    resetTime: windowStart + windowMs,
  };
};

module.exports = {
  verifyJWT,
  generateJWT,
  verifyApiKey,
  generateApiKey,
  hashApiKey,
  hasPermission,
  getUserById,
  checkRateLimit,
};
