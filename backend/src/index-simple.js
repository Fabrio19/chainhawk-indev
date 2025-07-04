const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Import middleware
const { auditLog } = require("./middlewares/audit");
const { authMiddleware } = require("./middlewares/auth");
const { errorMiddleware } = require("./middlewares/error");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const auditRoutes = require("./routes/audit");
const tracingRoutes = require("./routes/tracing");
const sanctionsRoutes = require("./routes/sanctions");
const casesRoutes = require("./routes/cases");
const strReportsRoutes = require("./routes/strReports");
const kycRoutes = require("./routes/kyc");
const webhookRoutes = require("./routes/webhooks");
const neo4jRoutes = require("./routes/neo4j");
const leReportRoutes = require("./routes/leReports");
const walletRoutes = require("./routes/wallets");
const reportsRoutes = require("./routes/reports");

// Import bridge routes
console.log("🔍 Loading bridge routes...");
try {
  const bridgeRoutes = require("./routes/bridges");
  console.log("✅ Bridge routes loaded successfully");
} catch (error) {
  console.error("❌ Failed to load bridge routes:", error);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081", 
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:8084",
        "http://localhost:8085"
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: Math.ceil(
      (parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000,
    ),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Logging middleware
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Custom audit logging middleware
app.use(auditLog);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "CryptoCompliance Backend",
    version: "1.0.0",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/audit", authMiddleware, auditRoutes);
app.use("/api/tracing", tracingRoutes);
app.use("/api/sanctions", sanctionsRoutes);
app.use("/api/cases", casesRoutes);
app.use("/api/str-reports", strReportsRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/neo4j", neo4jRoutes);
app.use("/api/le-reports", leReportRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/reports", reportsRoutes);

// Register bridge routes
console.log("🔍 Registering bridge routes...");
try {
  const bridgeRoutes = require("./routes/bridges");
  app.use("/api/bridges", bridgeRoutes);
  console.log("✅ Bridge routes registered successfully at /api/bridges");
} catch (error) {
  console.error("❌ Failed to register bridge routes:", error);
}

// Dashboard stats endpoint
app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    res.json({
      totalWallets: 45678,
      highRiskWallets: 234,
      todayTransactions: 12456,
      suspiciousTransactions: 89,
      openCases: 23,
      pendingReports: 5,
      activeAlerts: 12,
      complianceScore: 87,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Alerts endpoint
app.get("/api/alerts", authMiddleware, async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Networks endpoint
app.get("/api/networks", authMiddleware, (req, res) => {
  res.json([
    {
      id: "ethereum",
      name: "Ethereum",
      symbol: "ETH",
      isEnabled: true,
      lastBlock: 19234567,
      avgBlockTime: 12,
      transactionFee: 0.002,
    },
    {
      id: "bitcoin",
      name: "Bitcoin", 
      symbol: "BTC",
      isEnabled: true,
      lastBlock: 823456,
      avgBlockTime: 600,
      transactionFee: 0.0001,
    },
    {
      id: "polygon",
      name: "Polygon",
      symbol: "MATIC", 
      isEnabled: true,
      lastBlock: 52789123,
      avgBlockTime: 2,
      transactionFee: 0.001,
    },
  ]);
});

// Integrations endpoint
app.get("/api/integrations", authMiddleware, (req, res) => {
  res.json([
    {
      id: "chainalysis",
      name: "Chainalysis",
      type: "compliance",
      status: "active",
      endpoint: "https://api.chainalysis.com",
      lastSync: new Date().toISOString(),
      apiKey: "sk_****_****",
      rateLimitRemaining: 4850,
    },
    {
      id: "binance",
      name: "Binance Exchange",
      type: "exchange",
      status: "active",
      endpoint: "https://api.binance.com",
      lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      apiKey: "api_****_****",
      rateLimitRemaining: 1200,
    },
  ]);
});

// Clusters endpoint
app.get("/api/clusters", authMiddleware, (req, res) => {
  res.json([]);
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    method: req.method,
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorMiddleware);

// Start server
const startServer = async () => {
  try {
    console.log("🚀 Starting simplified server...");
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 CryptoCompliance Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔐 JWT Expiry: ${process.env.JWT_EXPIRE || "8h"}`);
      console.log(`🌐 CORS Origin: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
      console.log(`📝 Audit Logging: ${process.env.ENABLE_AUDIT_LOGGING === "true" ? "Enabled" : "Disabled"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("🛑 Shutting down gracefully...");
  
  // Close Prisma connection
  await prisma.$disconnect();
  console.log("🗄️ Database connection closed");

  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

module.exports = app; 