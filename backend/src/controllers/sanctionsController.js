const { validationResult } = require("express-validator");
const {
  syncOFAC,
  syncUN,
  checkWalletSanctions,
  searchSanctions: searchSanctionsService,
  getSyncHistory,
  getSanctionsStats,
  addFIUINDEntry,
} = require("../services/sanctionsSyncService");

/**
 * Sanctions Controller
 * Handles sanctions list management and checking
 */

/**
 * Check wallet against sanctions lists
 * POST /sanctions/check
 */
const checkWallet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { walletAddress, chain } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required",
      });
    }

    console.log(`🔍 Checking wallet: ${walletAddress} (${chain || "any chain"})`);

    const result = await checkWalletSanctions(walletAddress, chain);

    return res.json({
      success: true,
      data: {
        walletAddress,
        chain,
        ...result,
        checkedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error checking wallet sanctions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Search sanctions lists
 * GET /sanctions/search
 */
const searchSanctionsList = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { query, limit = 50 } = req.query;

    const results = await searchSanctionsService(query, parseInt(limit));

    res.json({
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Search sanctions error:", error);
    res.status(500).json({
      error: "Failed to search sanctions lists",
      code: "SANCTIONS_SEARCH_FAILED",
    });
  }
};

/**
 * Get sanctions statistics
 * GET /sanctions/stats
 */
const getSanctionsStatistics = async (req, res) => {
  try {
    const stats = await getSanctionsStats();

    res.json({
      stats,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Get sanctions stats error:", error);
    res.status(500).json({
      error: "Failed to get sanctions statistics",
      code: "SANCTIONS_STATS_FAILED",
    });
  }
};

/**
 * Sync OFAC sanctions list (admin only)
 * POST /sanctions/sync/ofac
 */
const syncOFACList = async (req, res) => {
  try {
    const result = await syncOFAC();

    res.json({
      message: "OFAC sync completed successfully",
      result,
    });
  } catch (error) {
    console.error("OFAC sync error:", error);
    res.status(500).json({
      error: "Failed to sync OFAC list",
      code: "OFAC_SYNC_FAILED",
      details: error.message,
    });
  }
};

/**
 * Sync UN sanctions list (admin only)
 * POST /sanctions/sync/un
 */
const syncUNList = async (req, res) => {
  try {
    const result = await syncUN();

    res.json({
      message: "UN sync completed successfully",
      result,
    });
  } catch (error) {
    console.error("UN sync error:", error);
    res.status(500).json({
      error: "Failed to sync UN list",
      code: "UN_SYNC_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get sync job history (admin only)
 * GET /sanctions/sync/history
 */
const getSyncJobHistory = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const history = await getSyncHistory(parseInt(limit));

    res.json({
      history,
      count: history.length,
    });
  } catch (error) {
    console.error("Get sync history error:", error);
    res.status(500).json({
      error: "Failed to get sync history",
      code: "SYNC_HISTORY_FAILED",
    });
  }
};

/**
 * Get all sanctions entries (admin only)
 * GET /sanctions/list
 */
const getSanctionsList = async (req, res) => {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const {
      page = 1,
      limit = 50,
      source,
      entityType,
      search,
      riskLevel,
    } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Build filter conditions
    const where = { isActive: true };
    if (source) where.source = source;
    if (entityType) where.entityType = entityType;
    if (riskLevel) where.riskLevel = riskLevel;
    if (search) {
      where.OR = [
        { entityName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [sanctions, total] = await Promise.all([
      prisma.sanctionsWatchlist.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
      prisma.sanctionsWatchlist.count({ where }),
    ]);

    res.json({
      sanctions,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Get sanctions list error:", error);
    res.status(500).json({
      error: "Failed to get sanctions list",
      code: "SANCTIONS_LIST_FAILED",
    });
  }
};

/**
 * Add custom sanctions entry (admin only)
 * POST /sanctions/custom
 */
const addCustomSanction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const {
      entityName,
      entityType,
      walletAddress,
      chain,
      country,
      description,
      riskLevel = "HIGH",
    } = req.body;

    const sanction = await prisma.sanctionsWatchlist.create({
      data: {
        source: "INTERNAL",
        entityName,
        entityType,
        walletAddress: walletAddress?.toLowerCase(),
        chain,
        country,
        description,
        riskLevel,
        metadata: {
          addedBy: req.user.sub,
          addedAt: new Date(),
        },
      },
    });

    res.status(201).json({
      message: "Custom sanctions entry added",
      sanction,
    });
  } catch (error) {
    console.error("Add custom sanction error:", error);
    res.status(500).json({
      error: "Failed to add custom sanctions entry",
      code: "CUSTOM_SANCTION_FAILED",
    });
  }
};

/**
 * Remove custom sanctions entry (admin only)
 * DELETE /sanctions/custom/:id
 */
const removeCustomSanction = async (req, res) => {
  try {
    const { id } = req.params;
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const sanction = await prisma.sanctionsWatchlist.findUnique({
      where: { id },
    });

    if (!sanction) {
      return res.status(404).json({
        error: "Sanctions entry not found",
        code: "SANCTION_NOT_FOUND",
      });
    }

    if (sanction.source !== "INTERNAL") {
      return res.status(400).json({
        error: "Cannot delete official sanctions entries",
        code: "CANNOT_DELETE_OFFICIAL",
      });
    }

    await prisma.sanctionsWatchlist.delete({
      where: { id },
    });

    res.json({
      message: "Custom sanctions entry removed",
      id,
    });
  } catch (error) {
    console.error("Remove custom sanction error:", error);
    res.status(500).json({
      error: "Failed to remove custom sanctions entry",
      code: "REMOVE_SANCTION_FAILED",
    });
  }
};

/**
 * Start OFAC sanctions sync
 */
const startOFACSync = async (req, res) => {
  try {
    console.log("🚀 Starting OFAC sync from API...");
    
    // Start sync in background
    syncOFAC()
      .then((result) => {
        console.log("✅ OFAC sync completed:", result);
      })
      .catch((error) => {
        console.error("❌ OFAC sync failed:", error);
      });

    return res.json({
      success: true,
      message: "OFAC sync started in background",
    });
  } catch (error) {
    console.error("Error starting OFAC sync:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start OFAC sync",
      error: error.message,
    });
  }
};

/**
 * Start UN sanctions sync
 */
const startUNSync = async (req, res) => {
  try {
    console.log("🚀 Starting UN sync from API...");
    
    // Start sync in background
    syncUN()
      .then((result) => {
        console.log("✅ UN sync completed:", result);
      })
      .catch((error) => {
        console.error("❌ UN sync failed:", error);
      });

    return res.json({
      success: true,
      message: "UN sync started in background",
    });
  } catch (error) {
    console.error("Error starting UN sync:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start UN sync",
      error: error.message,
    });
  }
};

/**
 * Add manual FIU-IND entry
 */
const addFIUINDEntryHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { entityName, entityType, walletAddress, chain, country, description, riskLevel, metadata } = req.body;

    if (!entityName) {
      return res.status(400).json({
        success: false,
        message: "Entity name is required",
      });
    }

    const result = await addFIUINDEntry({
      entityName,
      entityType,
      walletAddress,
      chain,
      country,
      description,
      riskLevel,
      metadata,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to add FIU-IND entry",
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: "FIU-IND entry added successfully",
      data: result.record,
    });
  } catch (error) {
    console.error("Error adding FIU-IND entry:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Search sanctions watchlist (direct DB)
const searchSanctions = async (req, res) => {
  try {
    const { query, source, entityType, limit = 50 } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    const where = {
      OR: [
        { entityName: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { walletAddress: { contains: query, mode: "insensitive" } },
      ],
      isActive: true,
      ...(source && { source }),
      ...(entityType && { entityType }),
    };
    const results = await prisma.sanctionsWatchlist.findMany({
      where,
      take: parseInt(limit),
      orderBy: { updatedAt: "desc" },
    });
    return res.json({
      success: true,
      data: {
        query,
        results,
        total: results.length,
      },
    });
  } catch (error) {
    console.error("Error searching sanctions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  checkWallet,
  checkWalletSanctions,
  searchSanctionsList,
  getSanctionsStatistics,
  syncOFACList,
  syncUNList,
  getSyncJobHistory,
  getSanctionsList,
  addCustomSanction,
  removeCustomSanction,
  startOFACSync,
  startUNSync,
  addFIUINDEntry: addFIUINDEntryHandler,
  searchSanctions,
};
