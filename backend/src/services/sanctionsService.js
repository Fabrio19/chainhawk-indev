const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const { PrismaClient } = require("@prisma/client");
const { checkWalletSanctions } = require("./sanctionsSyncService");

const prisma = new PrismaClient();

/**
 * Sanctions Sync Service
 * Handles synchronization of global sanctions lists
 */

const SANCTIONS_SOURCES = {
  OFAC: {
    url: "https://ofac.treasury.gov/downloads/sdn.xml",
    name: "OFAC SDN",
  },
  UN: {
    url: "https://scsanctions.un.org/resources/xml/en/consolidated.xml",
    name: "UN Sanctions",
  },
  EU: {
    url: "https://webgate.ec.europa.eu/europeaid/fsd/fsf/public/files/xmlFullSanctionsList.xml",
    name: "EU Sanctions",
  },
};

/**
 * Parse OFAC SDN XML data
 */
const parseOFACData = (xmlData) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsed = parser.parse(xmlData);
  const entries = [];

  try {
    const sdnList = parsed?.sdnList?.sdnEntry || [];
    const sdnEntries = Array.isArray(sdnList) ? sdnList : [sdnList];

    for (const entry of sdnEntries) {
      if (!entry) continue;

      // Extract basic information
      const entityName = entry.firstName
        ? `${entry.firstName} ${entry.lastName || ""}`.trim()
        : entry.lastName || entry.title || "Unknown";

      const entityType = entry.sdnType?.includes("Individual")
        ? "INDIVIDUAL"
        : "ENTITY";

      entries.push({
        source: "OFAC",
        entityName,
        entityType,
        country: entry.nationality || entry.country || null,
        description: entry.remarks || null,
        riskLevel: "HIGH",
        metadata: {
          uid: entry["@_uid"],
          sdnType: entry.sdnType,
          title: entry.title,
          dateOfBirth: entry.dateOfBirth,
          placeOfBirth: entry.placeOfBirth,
          nationality: entry.nationality,
          remarks: entry.remarks,
        },
      });

      // Extract addresses if any
      if (entry.addressList?.address) {
        const addresses = Array.isArray(entry.addressList.address)
          ? entry.addressList.address
          : [entry.addressList.address];

        for (const address of addresses) {
          if (address.address1) {
            entries.push({
              source: "OFAC",
              entityName: `${entityName} (Address)`,
              entityType: "ENTITY",
              country: address.country || entry.country || null,
              description:
                `Address: ${address.address1} ${address.address2 || ""} ${address.city || ""} ${address.stateOrProvince || ""} ${address.postalCode || ""}`.trim(),
              riskLevel: "HIGH",
              metadata: {
                parentUid: entry["@_uid"],
                addressType: "physical",
                ...address,
              },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error parsing OFAC data:", error);
  }

  return entries;
};

/**
 * Parse UN Sanctions XML data
 */
const parseUNData = (xmlData) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsed = parser.parse(xmlData);
  const entries = [];

  try {
    const individuals =
      parsed?.CONSOLIDATED_LIST?.INDIVIDUALS?.INDIVIDUAL || [];
    const entities = parsed?.CONSOLIDATED_LIST?.ENTITIES?.ENTITY || [];

    // Process individuals
    const individualList = Array.isArray(individuals)
      ? individuals
      : [individuals];
    for (const individual of individualList) {
      if (!individual) continue;

      const names = individual.NAME || individual.INDIVIDUAL_ALIAS || {};
      const firstName = names.FIRST_NAME || "";
      const lastName = names.SECOND_NAME || names.THIRD_NAME || "";
      const entityName = `${firstName} ${lastName}`.trim() || "Unknown";

      entries.push({
        source: "UN",
        entityName,
        entityType: "INDIVIDUAL",
        country: individual.NATIONALITY?.VALUE || null,
        description: individual.COMMENTS1 || null,
        riskLevel: "HIGH",
        metadata: {
          dataid: individual["@_dataid"],
          listType: individual.LIST_TYPE?.VALUE,
          nationality: individual.NATIONALITY?.VALUE,
          dateOfBirth: individual.INDIVIDUAL_DATE_OF_BIRTH?.DATE,
          placeOfBirth: individual.INDIVIDUAL_PLACE_OF_BIRTH?.VALUE,
        },
      });
    }

    // Process entities
    const entityList = Array.isArray(entities) ? entities : [entities];
    for (const entity of entityList) {
      if (!entity) continue;

      const entityName = entity.NAME?.VALUE || "Unknown";

      entries.push({
        source: "UN",
        entityName,
        entityType: "ENTITY",
        country: entity.ENTITY_ADDRESS?.COUNTRY || null,
        description: entity.COMMENTS1 || null,
        riskLevel: "HIGH",
        metadata: {
          dataid: entity["@_dataid"],
          listType: entity.LIST_TYPE?.VALUE,
          address: entity.ENTITY_ADDRESS,
        },
      });
    }
  } catch (error) {
    console.error("Error parsing UN data:", error);
  }

  return entries;
};

/**
 * Parse EU Sanctions XML data
 */
const parseEUData = (xmlData) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsed = parser.parse(xmlData);
  const entries = [];

  try {
    const export_data = parsed?.export || {};
    const persons = export_data?.sanctionEntity || [];

    const personList = Array.isArray(persons) ? persons : [persons];
    for (const person of personList) {
      if (!person) continue;

      const names = person.nameAlias || [];
      const nameList = Array.isArray(names) ? names : [names];
      const primaryName = nameList[0]?.wholeName || "Unknown";

      const entityType =
        person.subjectType?.classificationCode === "P"
          ? "INDIVIDUAL"
          : "ENTITY";

      entries.push({
        source: "EU",
        entityName: primaryName,
        entityType,
        country: person.citizenship?.[0]?.countryIso2Code || null,
        description: person.remark || null,
        riskLevel: "HIGH",
        metadata: {
          logicalId: person["@_logicalId"],
          subjectType: person.subjectType,
          citizenship: person.citizenship,
          regulation: person.regulation,
          birthDate: person.birthDate,
        },
      });
    }
  } catch (error) {
    console.error("Error parsing EU data:", error);
  }

  return entries;
};

/**
 * Sync OFAC sanctions list
 */
const syncOFAC = async () => {
  console.log("🔄 Starting OFAC sync...");

  const job = await prisma.syncJob.create({
    data: {
      source: "OFAC",
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  try {
    console.log("📥 Downloading OFAC data...");
    const response = await axios.get(SANCTIONS_SOURCES.OFAC.url, {
      timeout: 60000,
      headers: {
        "User-Agent": "CryptoCompliance-Bot/1.0",
      },
    });

    console.log("🔍 Parsing OFAC data...");
    const entries = parseOFACData(response.data);

    console.log(`📊 Processing ${entries.length} OFAC entries...`);
    let added = 0;
    let updated = 0;

    for (const entry of entries) {
      try {
        const existing = await prisma.sanctionsWatchlist.findFirst({
          where: {
            source: "OFAC",
            entityName: entry.entityName,
            walletAddress: entry.walletAddress || null,
          },
        });

        if (existing) {
          await prisma.sanctionsWatchlist.update({
            where: { id: existing.id },
            data: {
              ...entry,
              updatedAt: new Date(),
            },
          });
          updated++;
        } else {
          await prisma.sanctionsWatchlist.create({
            data: entry,
          });
          added++;
        }
      } catch (error) {
        console.error(
          `Error processing OFAC entry: ${entry.entityName}`,
          error,
        );
      }
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        recordsProcessed: entries.length,
        recordsAdded: added,
        recordsUpdated: updated,
      },
    });

    console.log(`✅ OFAC sync completed: ${added} added, ${updated} updated`);
    return { success: true, added, updated, total: entries.length };
  } catch (error) {
    console.error("❌ OFAC sync failed:", error);

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error.message,
      },
    });

    throw error;
  }
};

/**
 * Sync UN sanctions list
 */
const syncUN = async () => {
  console.log("🔄 Starting UN sync...");

  const job = await prisma.syncJob.create({
    data: {
      source: "UN",
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  try {
    console.log("📥 Downloading UN data...");
    const response = await axios.get(SANCTIONS_SOURCES.UN.url, {
      timeout: 60000,
      headers: {
        "User-Agent": "CryptoCompliance-Bot/1.0",
      },
    });

    console.log("🔍 Parsing UN data...");
    const entries = parseUNData(response.data);

    console.log(`📊 Processing ${entries.length} UN entries...`);
    let added = 0;
    let updated = 0;

    for (const entry of entries) {
      try {
        const existing = await prisma.sanctionsWatchlist.findFirst({
          where: {
            source: "UN",
            entityName: entry.entityName,
            walletAddress: entry.walletAddress || null,
          },
        });

        if (existing) {
          await prisma.sanctionsWatchlist.update({
            where: { id: existing.id },
            data: {
              ...entry,
              updatedAt: new Date(),
            },
          });
          updated++;
        } else {
          await prisma.sanctionsWatchlist.create({
            data: entry,
          });
          added++;
        }
      } catch (error) {
        console.error(`Error processing UN entry: ${entry.entityName}`, error);
      }
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        recordsProcessed: entries.length,
        recordsAdded: added,
        recordsUpdated: updated,
      },
    });

    console.log(`✅ UN sync completed: ${added} added, ${updated} updated`);
    return { success: true, added, updated, total: entries.length };
  } catch (error) {
    console.error("❌ UN sync failed:", error);

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error.message,
      },
    });

    throw error;
  }
};

/**
 * Check wallet against sanctions lists
 * @deprecated Use checkWalletSanctions from sanctionsSyncService instead
 */
const checkWalletSanctionsLegacy = async (walletAddress, chain = null) => {
  console.warn("⚠️  Using deprecated checkWalletSanctionsLegacy. Use checkWalletSanctions from sanctionsSyncService instead.");
  
  // Trigger webhook for wallet screening
  try {
    const { triggerWebhook } = require("./webhookService");
    await triggerWebhook("wallet_screened", {
      walletAddress,
      chain,
      timestamp: new Date().toISOString(),
      screeningType: "sanctions_check",
    });
  } catch (error) {
    console.error("Failed to trigger webhook:", error);
  }
  
  return await checkWalletSanctions(walletAddress, chain);
};

/**
 * Search sanctions lists by entity name
 */
const searchSanctions = async (query, limit = 50) => {
  const results = await prisma.sanctionsWatchlist.findMany({
    where: {
      OR: [
        {
          entityName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
      isActive: true,
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return results;
};

/**
 * Get sync job history
 */
const getSyncHistory = async (source = null, limit = 20) => {
  const jobs = await prisma.syncJob.findMany({
    where: source ? { source } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return jobs;
};

/**
 * Get sanctions statistics
 */
const getSanctionsStats = async () => {
  const stats = await prisma.sanctionsWatchlist.groupBy({
    by: ["source"],
    _count: {
      id: true,
    },
    where: {
      isActive: true,
    },
  });

  const lastUpdates = await prisma.sanctionsWatchlist.groupBy({
    by: ["source"],
    _max: {
      updatedAt: true,
    },
    where: {
      isActive: true,
    },
  });

  const result = stats.map((stat) => {
    const lastUpdate = lastUpdates.find((u) => u.source === stat.source);
    return {
      source: stat.source,
      count: stat._count.id,
      lastUpdated: lastUpdate?._max?.updatedAt,
    };
  });

  return result;
};

module.exports = {
  syncOFAC,
  syncUN,
  checkWalletSanctions: checkWalletSanctionsLegacy,
  searchSanctions,
  getSyncHistory,
  getSanctionsStats,
  parseOFACData,
  parseUNData,
  parseEUData,
};
