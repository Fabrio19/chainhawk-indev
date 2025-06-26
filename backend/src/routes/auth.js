const express = require("express");
const { body } = require("express-validator");
const { asyncHandler } = require("../middlewares/error");
const { authMiddleware } = require("../middlewares/auth");
const {
  register,
  login,
  getProfile,
  generateApiKey,
  revokeApiKey,
} = require("../controllers/userController");

const router = express.Router();

/**
 * POST /auth/register - Register a new user
 * Body: { name, email, password, role? }
 */
router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("role")
      .optional()
      .isIn(["admin", "analyst", "partner"])
      .withMessage("Invalid role"),
  ],
  asyncHandler(register),
);

/**
 * POST /auth/login - Login user and get JWT token
 * Body: { email, password }
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  asyncHandler(login),
);

/**
 * GET /auth/profile - Get current user profile
 * Requires: JWT token or API key
 */
router.get("/profile", authMiddleware, asyncHandler(getProfile));

/**
 * POST /auth/api-key - Generate new API key
 * Body: { name? }
 * Requires: JWT token
 */
router.post(
  "/api-key",
  authMiddleware,
  [body("name").optional().trim().isLength({ min: 1 })],
  asyncHandler(generateApiKey),
);

/**
 * DELETE /auth/api-key - Revoke API key
 * Requires: JWT token
 */
router.delete("/api-key", authMiddleware, asyncHandler(revokeApiKey));

/**
 * POST /auth/change-password - Change user password
 * Body: { currentPassword, newPassword }
 * Requires: JWT token
 */
router.post(
  "/change-password",
  authMiddleware,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters"),
  ],
  asyncHandler(async (req, res) => {
    const bcrypt = require("bcryptjs");
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.sub;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isValidPassword) {
      return res.status(400).json({
        error: "Current password is incorrect",
        code: "INVALID_CURRENT_PASSWORD",
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    res.json({
      message: "Password changed successfully",
    });
  }),
);

module.exports = router;
