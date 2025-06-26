const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const prisma = new PrismaClient();

/**
 * User Management Controller
 * Handles user CRUD operations, authentication, and API key management
 */

/**
 * Register a new user
 * POST /auth/register
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { name, email, password, role = "analyst" } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
        code: "USER_EXISTS",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        status: "active",
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "8h" },
    );

    // Remove sensitive data from response
    const { passwordHash: _, apiKeyHash: __, ...userResponse } = user;

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "REGISTRATION_FAILED",
    });
  }
};

/**
 * Login user and get JWT token
 * POST /auth/login
 */
const login = async (req, res) => {
  try {
    console.log('LOGIN REQUEST BODY:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if user is active
    if (user.status !== "active") {
      return res.status(401).json({
        error: "Account is suspended",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "8h" },
    );

    // Remove sensitive data from response
    const { passwordHash: _, apiKeyHash: __, ...userResponse } = user;

    res.json({
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "LOGIN_FAILED",
    });
  }
};

/**
 * Get current user profile
 * GET /auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
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
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({
      user,
      authMethod: req.authMethod || "JWT",
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "PROFILE_FETCH_FAILED",
    });
  }
};

/**
 * Generate API key for user
 * POST /auth/api-key
 */
const generateApiKey = async (req, res) => {
  try {
    const { name = "Default API Key" } = req.body;
    const userId = req.user.sub;

    // Generate random API key (128 characters)
    const apiKey = crypto.randomBytes(64).toString("hex");
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    // Remove existing API key for this user (one key per user)
    await prisma.apiKey.deleteMany({
      where: { userId },
    });

    // Create new API key record
    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        userId,
        permissions: ["wallet_screening", "transaction_tracing"], // Default permissions
      },
    });

    // Update user's api_key_hash
    await prisma.user.update({
      where: { id: userId },
      data: { apiKeyHash: keyHash },
    });

    res.json({
      message: "API key generated successfully",
      apiKey, // Return the plain key only once
      name: apiKeyRecord.name,
      keyPreview: `${apiKey.substring(0, 8)}****`,
      permissions: apiKeyRecord.permissions,
    });
  } catch (error) {
    console.error("API key generation error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "API_KEY_GENERATION_FAILED",
    });
  }
};

/**
 * Revoke API key
 * DELETE /auth/api-key
 */
const revokeApiKey = async (req, res) => {
  try {
    const userId = req.user.sub;

    // Delete API key record
    await prisma.apiKey.deleteMany({
      where: { userId },
    });

    // Remove api_key_hash from user
    await prisma.user.update({
      where: { id: userId },
      data: { apiKeyHash: null },
    });

    res.json({
      message: "API key revoked successfully",
    });
  } catch (error) {
    console.error("API key revocation error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "API_KEY_REVOCATION_FAILED",
    });
  }
};

/**
 * Get all users (admin only)
 * GET /users
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Build filter conditions
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "USERS_FETCH_FAILED",
    });
  }
};

/**
 * Create new user (admin only)
 * POST /users
 */
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { name, email, role, status = "active" } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
        code: "USER_EXISTS",
      });
    }

    // Generate temporary password
    const temporaryPassword = crypto.randomBytes(12).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        status,
      },
    });

    // Remove sensitive data from response
    const { passwordHash: _, apiKeyHash: __, ...userResponse } = user;

    res.status(201).json({
      message: "User created successfully",
      user: userResponse,
      temporaryPassword, // Return only once for admin to share
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "USER_CREATION_FAILED",
    });
  }
};

/**
 * Update user (admin only)
 * PUT /users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(status && { status }),
      },
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

    res.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "USER_UPDATE_FAILED",
    });
  }
};

/**
 * Delete user (admin only)
 * DELETE /users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.user.sub) {
      return res.status(400).json({
        error: "Cannot delete your own account",
        code: "CANNOT_DELETE_SELF",
      });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "USER_DELETION_FAILED",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  generateApiKey,
  revokeApiKey,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
