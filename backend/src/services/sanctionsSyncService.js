const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { XMLParser } = require("fast-xml-parser");

const prisma = new PrismaClient();

/**
 * Sanctions Sync Service
 * Handles downloading and syncing sanctions data from various sources
 */

// XML Parser configuration
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

/**
 * Create a new sync job record
 */
const createSyncJob = async (source) => {
  return await prisma.syncJob.create({
    data: {
      source,
      status: "PENDING",
    },
  });
};

/**
 * Update sync job status
 */
const updateSyncJob = async (jobId, updates) => {
  return await prisma.syncJob.update({
    where: { id: jobId },
    data: updates,
  });
};

/**
 * Extract wallet addresses from text using regex patterns
 */
const extractWalletAddresses = (text) => {
  const patterns = [
    // Ethereum addresses
    /0x[a-fA-F0-9]{40}/g,
    // Bitcoin addresses (basic pattern)
    /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/g,
  ];

  const addresses = [];
  patterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      addresses.push(...matches);
    }
  });

  return [...new Set(addresses)]; // Remove duplicates
};

/**
 * Determine entity type from sanctions data
 */
const determineEntityType = (entityData) => {
  const name = entityData.name || entityData.entityName || "";
  const type = entityData.type || entityData.entityType || "";

  if (type.toLowerCase().includes("individual") || type.toLowerCase().includes("person")) {
    return "INDIVIDUAL";
  }
  if (type.toLowerCase().includes("entity") || type.toLowerCase().includes("organization")) {
    return "ENTITY";
  }
  if (type.toLowerCase().includes("vessel")) {
    return "VESSEL";
  }
  if (type.toLowerCase().includes("aircraft")) {
    return "AIRCRAFT";
  }
  if (type.toLowerCase().includes("wallet") || type.toLowerCase().includes("address")) {
    return "WALLET";
  }
  if (type.toLowerCase().includes("exchange")) {
    return "EXCHANGE";
  }
  if (type.toLowerCase().includes("mixer")) {
    return "MIXER";
  }
  if (type.toLowerCase().includes("darknet")) {
    return "DARKNET";
  }

  // Default based on name patterns
  if (name.match(/0x[a-fA-F0-9]{40}/)) {
    return "WALLET";
  }

  return "ENTITY";
};

/**
 * Sync OFAC SDN (Specially Designated Nationals) list
 */
const syncOFAC = async () => {
  const job = await createSyncJob("OFAC");
  
  try {
    await updateSyncJob(job.id, {
      status: "RUNNING",
      startedAt: new Date(),
    });

    console.log("🔄 Starting OFAC SDN sync...");

    // OFAC SDN XML feed URL
    const url = "https://www.treasury.gov/ofac/downloads/sdn.xml";
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent": "CryptoCompliance/1.0",
      },
    });

    const data = xmlParser.parse(response.data);
    const sdnList = data.sdnList?.sdnEntry || [];

    let processed = 0;
    let added = 0;
    let updated = 0;

    for (const entry of sdnList) {
      try {
        const entityName = entry.lastName || entry.entityName || entry.name || "Unknown";
        const entityType = determineEntityType(entry);
        
        // Extract wallet addresses from remarks and other fields
        const remarks = entry.remarks || "";
        const addresses = extractWalletAddresses(remarks);
        
        // Create base record
        const recordData = {
          source: "OFAC",
          entityName,
          entityType,
          country: entry.country || null,
          description: remarks || null,
          riskLevel: "HIGH",
          metadata: {
            uid: entry.uid,
            sdnType: entry.sdnType,
            program: entry.program,
          },
        };

        // If we found wallet addresses, create separate records for each
        if (addresses.length > 0) {
          for (const address of addresses) {
            const chain = address.startsWith("0x") ? "ETH" : "BTC";
            
            await prisma.sanctionsWatchlist.upsert({
              where: {
                source_entityName_walletAddress: {
                  source: "OFAC",
                  entityName,
                  walletAddress: address,
                },
              },
              update: {
                ...recordData,
                walletAddress: address,
                chain,
                updatedAt: new Date(),
              },
              create: {
                ...recordData,
                walletAddress: address,
                chain,
              },
            });
            
            updated++;
          }
        } else {
          // Create record without wallet address
          await prisma.sanctionsWatchlist.upsert({
            where: {
              source_entityName_walletAddress: {
                source: "OFAC",
                entityName,
                walletAddress: null,
              },
            },
            update: {
              ...recordData,
              updatedAt: new Date(),
            },
            create: recordData,
          });
          
          updated++;
        }

        processed++;
      } catch (error) {
        console.error(`Error processing OFAC entry:`, error);
      }
    }

    await updateSyncJob(job.id, {
      status: "COMPLETED",
      completedAt: new Date(),
      recordsProcessed: processed,
      recordsAdded: added,
      recordsUpdated: updated,
    });

    console.log(`✅ OFAC sync completed: ${processed} processed, ${added} added, ${updated} updated`);
    return { success: true, processed, added, updated };

  } catch (error) {
    console.error("❌ OFAC sync failed:", error);
    
    await updateSyncJob(job.id, {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: error.message,
    });

    return { success: false, error: error.message };
  }
};

/**
 * Sync UN Sanctions list
 */
const syncUN = async () => {
  const job = await createSyncJob("UN");
  
  try {
    await updateSyncJob(job.id, {
      status: "RUNNING",
      startedAt: new Date(),
    });

    console.log("🔄 Starting UN Sanctions sync...");

    const url = "https://scsanctions.un.org/resources/xml/en/consolidated.xml";
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent": "CryptoCompliance/1.0",
      },
    });

    const data = xmlParser.parse(response.data);
    const individuals = data.INDIVIDUALS?.INDIVIDUAL || [];
    const entities = data.ENTITIES?.ENTITY || [];

    let processed = 0;
    let added = 0;
    let updated = 0;

    // Process individuals
    for (const individual of individuals) {
      try {
        const entityName = individual.FIRST_NAME + " " + individual.SECOND_NAME;
        const remarks = individual.COMMENTS1 || "";
        const addresses = extractWalletAddresses(remarks);

        const recordData = {
          source: "UN",
          entityName,
          entityType: "INDIVIDUAL",
          country: individual.NATIONALITY || null,
          description: remarks || null,
          riskLevel: "HIGH",
          metadata: {
            dataId: individual.DATAID,
            firstName: individual.FIRST_NAME,
            secondName: individual.SECOND_NAME,
            unListType: individual.UN_LIST_TYPE,
            referenceNumber: individual.REFERENCE_NUMBER,
            listedOn: individual.LISTED_ON,
          },
        };

        if (addresses.length > 0) {
          for (const address of addresses) {
            const chain = address.startsWith("0x") ? "ETH" : "BTC";
            
            await prisma.sanctionsWatchlist.upsert({
              where: {
                source_entityName_walletAddress: {
                  source: "UN",
                  entityName,
                  walletAddress: address,
                },
              },
              update: {
                ...recordData,
                walletAddress: address,
                chain,
                updatedAt: new Date(),
              },
              create: {
                ...recordData,
                walletAddress: address,
                chain,
              },
            });
            
            updated++;
          }
        } else {
          await prisma.sanctionsWatchlist.upsert({
            where: {
              source_entityName_walletAddress: {
                source: "UN",
                entityName,
                walletAddress: null,
              },
            },
            update: {
              ...recordData,
              updatedAt: new Date(),
            },
            create: recordData,
          });
          
          updated++;
        }

        processed++;
      } catch (error) {
        console.error(`Error processing UN individual:`, error);
      }
    }

    // Process entities
    for (const entity of entities) {
      try {
        const entityName = entity.FIRST_NAME || entity.SECOND_NAME || "Unknown Entity";
        const remarks = entity.COMMENTS1 || "";
        const addresses = extractWalletAddresses(remarks);

        const recordData = {
          source: "UN",
          entityName,
          entityType: "ENTITY",
          country: entity.NATIONALITY || null,
          description: remarks || null,
          riskLevel: "HIGH",
          metadata: {
            dataId: entity.DATAID,
            firstName: entity.FIRST_NAME,
            secondName: entity.SECOND_NAME,
            unListType: entity.UN_LIST_TYPE,
            referenceNumber: entity.REFERENCE_NUMBER,
            listedOn: entity.LISTED_ON,
          },
        };

        if (addresses.length > 0) {
          for (const address of addresses) {
            const chain = address.startsWith("0x") ? "ETH" : "BTC";
            
            await prisma.sanctionsWatchlist.upsert({
              where: {
                source_entityName_walletAddress: {
                  source: "UN",
                  entityName,
                  walletAddress: address,
                },
              },
              update: {
                ...recordData,
                walletAddress: address,
                chain,
                updatedAt: new Date(),
              },
              create: {
                ...recordData,
                walletAddress: address,
                chain,
              },
            });
            
            updated++;
          }
        } else {
          await prisma.sanctionsWatchlist.upsert({
            where: {
              source_entityName_walletAddress: {
                source: "UN",
                entityName,
                walletAddress: null,
              },
            },
            update: {
              ...recordData,
              updatedAt: new Date(),
            },
            create: recordData,
          });
          
          updated++;
        }

        processed++;
      } catch (error) {
        console.error(`Error processing UN entity:`, error);
      }
    }

    await updateSyncJob(job.id, {
      status: "COMPLETED",
      completedAt: new Date(),
      recordsProcessed: processed,
      recordsAdded: added,
      recordsUpdated: updated,
    });

    console.log(`✅ UN sync completed: ${processed} processed, ${added} added, ${updated} updated`);
    return { success: true, processed, added, updated };

  } catch (error) {
    console.error("❌ UN sync failed:", error);
    
    await updateSyncJob(job.id, {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: error.message,
    });

    return { success: false, error: error.message };
  }
};

/**
 * Add manual FIU-IND entries
 */
const addFIUINDEntry = async (entryData) => {
  try {
    const record = await prisma.sanctionsWatchlist.create({
      data: {
        source: "FIU_IND",
        entityName: entryData.entityName,
        entityType: entryData.entityType || "ENTITY",
        walletAddress: entryData.walletAddress || null,
        chain: entryData.chain || null,
        country: entryData.country || "India",
        description: entryData.description || null,
        riskLevel: entryData.riskLevel || "HIGH",
        metadata: entryData.metadata || {},
      },
    });

    console.log(`✅ Added FIU-IND entry: ${entryData.entityName}`);
    return { success: true, record };
  } catch (error) {
    console.error("❌ Failed to add FIU-IND entry:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Check wallet against sanctions watchlist
 */
const checkWalletSanctions = async (walletAddress, chain = null) => {
  try {
    const matches = await prisma.sanctionsWatchlist.findMany({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        isActive: true,
        ...(chain && { chain }),
      },
      orderBy: { updatedAt: "desc" },
    });

    if (matches.length === 0) {
      return {
        isSanctioned: false,
        riskLevel: "LOW",
        matches: [],
        message: "Wallet not found in sanctions lists",
      };
    }

    const highestRisk = matches.reduce((highest, match) => {
      const riskLevels = { LOW: 1, MEDIUM: 2, HIGH: 3 };
      const currentRisk = riskLevels[match.riskLevel] || 1;
      const highestRisk = riskLevels[highest] || 1;
      return currentRisk > highestRisk ? match.riskLevel : highest;
    }, "LOW");

    return {
      isSanctioned: true,
      riskLevel: highestRisk,
      matches,
      message: `Wallet found in ${matches.length} sanctions list(s)`,
    };
  } catch (error) {
    console.error("Error checking wallet sanctions:", error);
    return {
      isSanctioned: false,
      riskLevel: "UNKNOWN",
      matches: [],
      message: "Error checking sanctions",
      error: error.message,
    };
  }
};

/**
 * Get sync job history
 */
const getSyncHistory = async (limit = 50) => {
  return await prisma.syncJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

/**
 * Get sanctions watchlist statistics
 */
const getSanctionsStats = async () => {
  const stats = await prisma.$transaction([
    prisma.sanctionsWatchlist.count(),
    prisma.sanctionsWatchlist.count({
      where: { walletAddress: { not: null } },
    }),
    prisma.sanctionsWatchlist.groupBy({
      by: ["source"],
      _count: { id: true },
    }),
    prisma.sanctionsWatchlist.groupBy({
      by: ["entityType"],
      _count: { id: true },
    }),
  ]);

  return {
    totalRecords: stats[0],
    recordsWithWallets: stats[1],
    bySource: stats[2].reduce((acc, item) => {
      acc[item.source] = item._count.id;
      return acc;
    }, {}),
    byEntityType: stats[3].reduce((acc, item) => {
      acc[item.entityType] = item._count.id;
      return acc;
    }, {}),
  };
};

/**
 * Search sanctions watchlist
 */
const searchSanctions = async (query, limit = 50) => {
  try {
    const where = {
      OR: [
        { entityName: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { walletAddress: { contains: query, mode: "insensitive" } },
      ],
      isActive: true,
    };

    const results = await prisma.sanctionsWatchlist.findMany({
      where,
      take: parseInt(limit),
      orderBy: { updatedAt: "desc" },
    });

    return results;
  } catch (error) {
    console.error("Error searching sanctions:", error);
    throw error;
  }
};

module.exports = {
  syncOFAC,
  syncUN,
  addFIUINDEntry,
  checkWalletSanctions,
  getSyncHistory,
  getSanctionsStats,
  searchSanctions,
};
