const express = require("express");
const { body, param, query } = require("express-validator");
const { asyncHandler } = require("../middlewares/error");
const { authMiddleware, requireAdmin } = require("../middlewares/auth");
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const router = express.Router();

// All user management routes require authentication
router.use(authMiddleware);

/**
 * GET /users - Get all users (admin only)
 * Query params: page, limit, role, status, search
 */
router.get(
  "/",
  requireAdmin,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("role").optional().isIn(["admin", "analyst", "partner"]),
    query("status").optional().isIn(["active", "suspended"]),
    query("search").optional().trim().isLength({ min: 1 }),
  ],
  asyncHandler(getUsers),
);

/**
 * POST /users - Create new user (admin only)
 * Body: { name, email, role, status? }
 */
router.post(
  "/",
  requireAdmin,
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("role")
      .isIn(["admin", "analyst", "partner"])
      .withMessage("Valid role is required"),
    body("status")
      .optional()
      .isIn(["active", "suspended"])
      .withMessage("Invalid status"),
  ],
  asyncHandler(createUser),
);

/**
 * GET /users/:id - Get user by ID (admin only)
 */
router.get(
  "/:id",
  requireAdmin,
  [param("id").isUUID().withMessage("Valid user ID is required")],
  asyncHandler(async (req, res) => {
    const { PrismaClient } = require("@prisma/client");
    const { validationResult } = require("express-validator");

    const prisma = new PrismaClient();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { id } = req.params;

    const [user, apiKeys, recentActivity] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.apiKey.findMany({
        where: { userId: id },
        select: {
          id: true,
          name: true,
          lastUsed: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { userId: id },
        select: {
          id: true,
          actionType: true,
          endpoint: true,
          httpMethod: true,
          responseStatus: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({
      user,
      apiKeys,
      recentActivity,
    });
  }),
);

/**
 * PUT /users/:id - Update user (admin only)
 * Body: { name?, email?, role?, status? }
 */
router.put(
  "/:id",
  requireAdmin,
  [
    param("id").isUUID().withMessage("Valid user ID is required"),
    body("name").optional().trim().isLength({ min: 2 }),
    body("email").optional().isEmail(),
    body("role").optional().isIn(["admin", "analyst", "partner"]),
    body("status").optional().isIn(["active", "suspended"]),
  ],
  asyncHandler(updateUser),
);

/**
 * DELETE /users/:id - Delete user (admin only)
 */
router.delete(
  "/:id",
  requireAdmin,
  [param("id").isUUID().withMessage("Valid user ID is required")],
  asyncHandler(deleteUser),
);

module.exports = router;
