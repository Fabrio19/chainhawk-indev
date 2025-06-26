const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  try {
    // Create admin user
    const adminPassword = "Admin123!";
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.upsert({
      where: { email: "admin@cryptocompliance.com" },
      update: {},
      create: {
        name: "System Administrator",
        email: "admin@cryptocompliance.com",
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "active",
      },
    });

    console.log("✅ Created admin user:", admin.email);

    // Create analyst user
    const analystPassword = "Analyst123!";
    const analystPasswordHash = await bcrypt.hash(analystPassword, 12);

    const analyst = await prisma.user.upsert({
      where: { email: "analyst@cryptocompliance.com" },
      update: {},
      create: {
        name: "Senior Analyst",
        email: "analyst@cryptocompliance.com",
        passwordHash: analystPasswordHash,
        role: "analyst",
        status: "active",
      },
    });

    console.log("✅ Created analyst user:", analyst.email);

    // Create partner user with API key
    const partnerPassword = "Partner123!";
    const partnerPasswordHash = await bcrypt.hash(partnerPassword, 12);

    const apiKey = crypto.randomBytes(64).toString("hex");
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const partner = await prisma.user.upsert({
      where: { email: "partner@exchange.com" },
      update: {},
      create: {
        name: "Exchange Partner",
        email: "partner@exchange.com",
        passwordHash: partnerPasswordHash,
        role: "partner",
        status: "active",
        apiKeyHash: apiKeyHash,
      },
    });

    console.log("✅ Created partner user:", partner.email);

    // Create API key record for partner
    await prisma.apiKey.upsert({
      where: { keyHash: apiKeyHash },
      update: {},
      create: {
        name: "Exchange API Key",
        keyHash: apiKeyHash,
        userId: partner.id,
        permissions: ["wallet_screening", "transaction_tracing"],
        isActive: true,
      },
    });

    console.log("✅ Created API key for partner");
    console.log("🔑 Partner API Key:", apiKey);

    // Create sample audit log entries
    const sampleAuditLogs = [
      {
        userId: admin.id,
        actionType: "auth_login",
        endpoint: "/auth/login",
        httpMethod: "POST",
        responseStatus: 200,
        ipAddress: "192.168.1.100",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        duration: 150,
      },
      {
        userId: analyst.id,
        actionType: "wallet_screening",
        endpoint: "/compliance/wallet-screen",
        httpMethod: "POST",
        responseStatus: 200,
        ipAddress: "192.168.1.101",
        userAgent:
          "Mozilla/5.0 (macOS; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        duration: 850,
        requestPayload: {
          walletAddress: "0x742d35cc6634c0532925a3b8d86c6cc9fc8c8b9e",
          scanDepth: 3,
        },
      },
      {
        userId: partner.id,
        actionType: "transaction_tracing",
        endpoint: "/compliance/transaction-trace",
        httpMethod: "POST",
        responseStatus: 200,
        ipAddress: "203.0.113.15",
        userAgent: "Exchange-API-Client/1.0",
        duration: 2340,
        requestPayload: {
          transactionHash:
            "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
        },
      },
    ];

    for (const logData of sampleAuditLogs) {
      await prisma.auditLog.create({
        data: {
          ...logData,
          createdAt: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
          ), // Random time in last 7 days
        },
      });
    }

    console.log("✅ Created sample audit log entries");

    // Create test users first
    const testUser = await prisma.user.upsert({
      where: { email: 'analyst@chainhawk.com' },
      update: {},
      create: {
        name: 'Test Analyst',
        email: 'analyst@chainhawk.com',
        passwordHash: '$2b$10$test.hash.for.development',
        role: 'analyst',
        status: 'active'
      }
    });

    console.log('Created test user:', testUser.id);

    // Create test cases
    const testCases = [
      {
        wallet_address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        risk_score: 85,
        status: 'New',
        assigned_to: testUser.id
      },
      {
        wallet_address: '0x8ba1f109551bD432803012645Hac136c772c3e',
        risk_score: 65,
        status: 'Investigating',
        assigned_to: testUser.id
      },
      {
        wallet_address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        risk_score: 45,
        status: 'Filed',
        assigned_to: testUser.id
      },
      {
        wallet_address: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C',
        risk_score: 95,
        status: 'Closed',
        assigned_to: testUser.id
      }
    ];

    for (const caseData of testCases) {
      const createdCase = await prisma.case.create({
        data: caseData
      });
      console.log('Created case:', createdCase.id);

      // Add some test actions for each case
      await prisma.caseAction.create({
        data: {
          case_id: createdCase.id,
          action: 'Case created and assigned',
          performed_by: testUser.id,
          details: { action: 'initial_assignment' }
        }
      });

      if (caseData.status === 'Investigating') {
        await prisma.caseAction.create({
          data: {
            case_id: createdCase.id,
            action: 'Investigation started - reviewing transaction patterns',
            performed_by: testUser.id,
            details: { action: 'investigation_started' }
          }
        });
      }

      if (caseData.status === 'Filed') {
        await prisma.caseAction.create({
          data: {
            case_id: createdCase.id,
            action: 'STR report filed with FIU-IND',
            performed_by: testUser.id,
            details: { action: 'str_filed', regulator: 'FIU-IND' }
          }
        });
      }

      if (caseData.status === 'Closed') {
        await prisma.caseAction.create({
          data: {
            case_id: createdCase.id,
            action: 'Case closed - investigation completed',
            performed_by: testUser.id,
            details: { action: 'case_closed', reason: 'investigation_completed' }
          }
        });
      }
    }

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📝 Default Credentials:");
    console.log("Admin: admin@cryptocompliance.com / Admin123!");
    console.log("Analyst: analyst@cryptocompliance.com / Analyst123!");
    console.log("Partner: partner@exchange.com / Partner123!");
    console.log("\n🔑 API Key for Partner:", apiKey);
    console.log("\n⚠️  Please change these credentials in production!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
