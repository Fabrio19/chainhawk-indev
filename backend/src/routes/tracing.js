const express = require("express");
const { body, param, query } = require("express-validator");
const { asyncHandler } = require("../middlewares/error");
const {
  authMiddleware,
  requirePermission,
  requireAnalyst,
} = require("../middlewares/auth");
const {
  startTransactionTrace,
  getTraceResults,
  getTraceHistory,
  quickWalletCheck,
  getTracingStats,
  cancelTrace,
} = require("../controllers/tracingController");
const { getTransactionByHash, traceTransactionWithDepth } = require('../services/tracingService');
const { traceAdvanced } = require('../services/advancedTracer');
const { USDTTracingService } = require('../services/usdtTracingService');

const router = express.Router();

// Simple trace endpoint for frontend (no auth required)
router.get("/trace/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const { depth = 1 } = req.query; // Default depth of 1 for backward compatibility
    
    if (depth > 1) {
      // Use recursive tracing for depth > 1
      const traceResult = await traceTransactionWithDepth(hash, parseInt(depth));
      res.json(traceResult);
    } else {
      // Use simple tracing for depth = 1 (backward compatibility)
      const tx = await getTransactionByHash(hash);
      res.json([tx]);
    }
  } catch (error) {
    console.error('Error in trace endpoint:', error.message);
    res.status(500).json({ error: 'Failed to trace transaction', details: error.message });
  }
});

// New deep trace endpoint for recursive tracing
router.get("/trace-deep/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const { depth = 3 } = req.query; // Default depth of 3
    
    console.log(`🔍 Starting deep trace for ${hash} with depth ${depth}`);
    
    const traceResult = await traceTransactionWithDepth(hash, parseInt(depth));
    
    res.json({
      success: true,
      data: traceResult
    });
    
  } catch (error) {
    console.error('Error in deep trace endpoint:', error.message);
    res.status(500).json({ 
      error: 'Failed to perform deep transaction trace', 
      details: error.message 
    });
  }
});

// Advanced recursive tracer endpoint with multi-chain support
router.get("/advanced/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const { depth = 3, chain = 'ethereum' } = req.query;
    
    console.log(`🔍 Starting advanced trace for ${hash} on ${chain} with depth ${depth}`);
    
    const result = await traceAdvanced(hash, { 
      maxDepth: parseInt(depth), 
      chain: chain.toLowerCase() 
    });
    
    res.json({ 
      success: true, 
      ...result,
      metadata: {
        originalHash: hash,
        chain: chain,
        depth: parseInt(depth),
        timestamp: new Date().toISOString(),
        cacheSize: result.cache?.size() || 0
      }
    });
    
  } catch (error) {
    console.error('Error in advanced trace endpoint:', error.message);
    res.status(500).json({ 
      error: 'Failed to perform advanced trace', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Multi-chain trace endpoint
router.get("/multi-chain/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const { depth = 2, chains = 'ethereum,bsc,polygon' } = req.query;
    
    const chainList = chains.split(',').map(c => c.trim().toLowerCase());
    const results = {};
    
    console.log(`🔍 Starting multi-chain trace for ${hash} on chains: ${chainList.join(', ')}`);
    
    for (const chain of chainList) {
      try {
        const result = await traceAdvanced(hash, { 
          maxDepth: parseInt(depth), 
          chain 
        });
        results[chain] = result;
      } catch (chainError) {
        console.error(`Error tracing on ${chain}:`, chainError.message);
        results[chain] = { error: chainError.message };
      }
    }
    
    res.json({ 
      success: true, 
      results,
      metadata: {
        originalHash: hash,
        chains: chainList,
        depth: parseInt(depth),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in multi-chain trace endpoint:', error.message);
    res.status(500).json({ 
      error: 'Failed to perform multi-chain trace', 
      details: error.message 
    });
  }
});

// USDT tracing endpoints
const usdtTracingService = new USDTTracingService();

// Single-chain USDT tracing
router.get("/usdt/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { chain = 'bsc', fromBlock, toBlock, limit = 50, includeZeroTransfers = false } = req.query;
    
    console.log(`💎 Tracing USDT for ${address} on ${chain}`);
    
    const options = {
      fromBlock: fromBlock ? parseInt(fromBlock) : null,
      toBlock: toBlock ? parseInt(toBlock) : null,
      limit: parseInt(limit),
      includeZeroTransfers: includeZeroTransfers === 'true'
    };
    
    const result = await usdtTracingService.traceUSDTTransfers(address, chain, options);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error in USDT trace endpoint:', error.message);
    res.status(500).json({ 
      error: 'Failed to trace USDT transfers', 
      details: error.message 
    });
  }
});

// Multi-chain USDT tracing
router.get("/usdt-multi/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { chains = 'bsc,ethereum,polygon', fromBlock, toBlock, limit = 50, includeZeroTransfers = false } = req.query;
    
    const chainList = chains.split(',').map(c => c.trim().toLowerCase());
    
    console.log(`💎 Tracing USDT for ${address} on chains: ${chainList.join(', ')}`);
    
    const options = {
      fromBlock: fromBlock ? parseInt(fromBlock) : null,
      toBlock: toBlock ? parseInt(toBlock) : null,
      limit: parseInt(limit),
      includeZeroTransfers: includeZeroTransfers === 'true'
    };
    
    const result = await usdtTracingService.traceUSDTMultiChain(address, chainList, options);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error in multi-chain USDT trace endpoint:', error.message);
    res.status(500).json({ 
      error: 'Failed to trace USDT transfers across chains', 
      details: error.message 
    });
  }
});

// USDT balance endpoint
router.get("/usdt-balance/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { chain = 'bsc' } = req.query;
    
    console.log(`💰 Getting USDT balance for ${address} on ${chain}`);
    
    const result = await usdtTracingService.getUSDTBalance(address, chain);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error in USDT balance endpoint:', error.message);
    res.status(500).json({ 
      error: 'Failed to get USDT balance', 
      details: error.message 
    });
  }
});

// All tracing routes require authentication
router.use(authMiddleware);

/**
 * POST /tracing/start - Start a new transaction trace
 * Body: { walletAddress, chain, depth? }
 */
router.post(
  "/start",
  requirePermission("transaction_tracing"),
  [
    body("walletAddress")
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid wallet address is required"),
    body("chain").notEmpty().withMessage("Chain is required"),
    body("depth").optional().isInt({ min: 1, max: 10 }),
  ],
  asyncHandler(startTransactionTrace),
);

/**
 * GET /tracing/:traceId - Get trace results
 */
router.get(
  "/:traceId",
  requirePermission("transaction_tracing"),
  [param("traceId").notEmpty().withMessage("Trace ID is required")],
  asyncHandler(getTraceResults),
);

/**
 * DELETE /tracing/:traceId - Cancel a pending trace
 */
router.delete(
  "/:traceId",
  requirePermission("transaction_tracing"),
  [param("traceId").notEmpty().withMessage("Trace ID is required")],
  asyncHandler(cancelTrace),
);

/**
 * GET /tracing/:traceId/export - Export trace results
 * Query params: format (pdf|csv|json)
 */
router.get(
  "/:traceId/export",
  requirePermission("transaction_tracing"),
  [
    param("traceId").notEmpty().withMessage("Trace ID is required"),
    query("format").optional().isIn(["pdf", "csv", "json"]),
  ],
  async (req, res) => {
    try {
      const { traceId } = req.params;
      const { format = "json" } = req.query;

      // Get trace results
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      
      const trace = await prisma.transactionTrace.findUnique({
        where: { traceId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
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

      if (format === "csv") {
        // Export as CSV
        const csv = [
          "Hop,Wallet Address,Risk Score,Risk Flags,Transaction Count,Connected Wallets,Depth",
          ...trace.hopsJson.map((hop, index) => [
            index + 1,
            hop.walletAddress,
            hop.riskAnalysis?.riskScore || 0,
            (hop.riskAnalysis?.risks || []).map(r => r.type).join(';'),
            hop.transactions?.length || 0,
            (hop.connectedWallets || []).join(';'),
            hop.depth
          ].join(','))
        ].join('\n');

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=trace-${traceId}-${new Date().toISOString().split("T")[0]}.csv`,
        );
        res.send(csv);
      } else if (format === "pdf") {
        // Export as PDF (basic implementation)
        const fs = require('fs');
        const path = require('path');
        
        // Create simple HTML content for PDF
        const html = `
          <html>
            <head>
              <title>Transaction Trace Report - ${traceId}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Transaction Trace Report</h1>
                <p>Trace ID: ${traceId}</p>
                <p>Generated: ${new Date().toISOString()}</p>
              </div>
              
              <div class="section">
                <h2>Trace Summary</h2>
                <p>Wallet: ${trace.walletAddress}</p>
                <p>Chain: ${trace.chain}</p>
                <p>Depth: ${trace.depth}</p>
                <p>Risk Level: ${(trace.riskLevel * 100).toFixed(1)}%</p>
                <p>Status: ${trace.status}</p>
              </div>
              
              <div class="section">
                <h2>Trace Hops</h2>
                <table>
                  <tr>
                    <th>Hop</th>
                    <th>Wallet Address</th>
                    <th>Risk Score</th>
                    <th>Risk Flags</th>
                    <th>Transactions</th>
                  </tr>
                  ${trace.hopsJson.map((hop, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${hop.walletAddress}</td>
                      <td>${(hop.riskAnalysis?.riskScore * 100 || 0).toFixed(1)}%</td>
                      <td>${(hop.riskAnalysis?.risks || []).map(r => r.type).join(', ')}</td>
                      <td>${hop.transactions?.length || 0}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            </body>
          </html>
        `;

        // For now, return HTML (in production, you'd use a PDF library like puppeteer)
        res.setHeader("Content-Type", "text/html");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=trace-${traceId}-${new Date().toISOString().split("T")[0]}.html`,
        );
        res.send(html);
      } else {
        // Export as JSON
        res.json({
          traceId,
          trace,
          exportedAt: new Date().toISOString(),
          format: "json"
        });
      }
    } catch (error) {
      console.error("Export trace error:", error);
      res.status(500).json({
        error: "Failed to export trace",
        code: "TRACE_EXPORT_FAILED",
      });
    }
  }
);

/**
 * GET /tracing/history - Get trace history
 * Query params: page, limit, status
 */
router.get(
  "/history",
  requirePermission("transaction_tracing"),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status")
      .optional()
      .isIn(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  ],
  asyncHandler(getTraceHistory),
);

/**
 * POST /tracing/quick-check - Quick wallet risk check
 * Body: { walletAddress, chain }
 */
router.post(
  "/quick-check",
  requirePermission("wallet_screening"),
  [
    body("walletAddress")
      .isLength({ min: 26, max: 62 })
      .withMessage("Valid wallet address is required"),
    body("chain").notEmpty().withMessage("Chain is required"),
  ],
  asyncHandler(quickWalletCheck),
);

/**
 * GET /tracing/stats - Get tracing statistics
 * Query params: days
 */
router.get(
  "/stats",
  requireAnalyst,
  [query("days").optional().isInt({ min: 1, max: 365 })],
  asyncHandler(getTracingStats),
);

module.exports = router;
