const { PrismaClient } = require("@prisma/client");
const { checkWalletSanctions } = require("../services/sanctionsSyncService");

const prisma = new PrismaClient();

/**
 * Search wallet by address
 * GET /api/wallets/:address
 */
const searchWallet = async (req, res) => {
  try {
    const { address } = req.params;
    const userId = req.user.id;

    // Check if wallet exists in our database
    const existingWallet = await prisma.wallet.findUnique({
      where: { address: address.toLowerCase() },
    });

    // Check sanctions
    const sanctionsCheck = await checkWalletSanctions(address);

    // Mock wallet data (in production, this would come from blockchain APIs)
    const walletData = {
      address: address,
      chain: address.startsWith("0x") ? "ethereum" : "bitcoin",
      balance: Math.random() * 1000000, // Mock balance
      riskScore: sanctionsCheck.isSanctioned ? 90 : Math.floor(Math.random() * 100),
      lastActivity: new Date().toISOString(),
      labels: sanctionsCheck.isSanctioned ? ["Sanctioned"] : ["Active"],
      isBlacklisted: sanctionsCheck.isSanctioned,
      entityType: "individual",
      sanctionsCheck: sanctionsCheck,
    };

    // If wallet exists in our database, merge the data
    if (existingWallet) {
      walletData.riskScore = existingWallet.riskScore;
      walletData.labels = existingWallet.labels;
      walletData.isBlacklisted = existingWallet.isBlacklisted;
      walletData.entityType = existingWallet.entityType;
    }

    res.json(walletData);
  } catch (error) {
    console.error("Error searching wallet:", error);
    res.status(500).json({
      error: "Failed to search wallet",
      message: error.message,
    });
  }
};

/**
 * Get wallet transactions
 * GET /api/wallets/:address/transactions
 */
const getWalletTransactions = async (req, res) => {
  try {
    const { address } = req.params;
    const userId = req.user.id;

    // Mock transaction data (in production, this would come from blockchain APIs)
    const mockTransactions = [
      {
        hash: "0x" + Math.random().toString(16).substr(2, 64),
        from: address,
        to: "0x" + Math.random().toString(16).substr(2, 40),
        amount: Math.random() * 100,
        currency: "ETH",
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        chain: "ethereum",
        blockNumber: Math.floor(Math.random() * 20000000),
        gasUsed: Math.floor(Math.random() * 500000),
        riskFlags: Math.random() > 0.8 ? ["high-value"] : [],
        category: Math.random() > 0.9 ? "suspicious" : "normal",
      },
      {
        hash: "0x" + Math.random().toString(16).substr(2, 64),
        from: "0x" + Math.random().toString(16).substr(2, 40),
        to: address,
        amount: Math.random() * 50,
        currency: "ETH",
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        chain: "ethereum",
        blockNumber: Math.floor(Math.random() * 20000000),
        gasUsed: Math.floor(Math.random() * 500000),
        riskFlags: [],
        category: "normal",
      },
    ];

    res.json(mockTransactions);
  } catch (error) {
    console.error("Error getting wallet transactions:", error);
    res.status(500).json({
      error: "Failed to get wallet transactions",
      message: error.message,
    });
  }
};

/**
 * Get wallet risk profile
 * GET /api/wallets/:address/risk-profile
 */
const getWalletRiskProfile = async (req, res) => {
  try {
    const { address } = req.params;
    const userId = req.user.id;

    // Check sanctions
    const sanctionsCheck = await checkWalletSanctions(address);

    // Mock risk profile data
    const riskProfile = {
      address: address,
      riskScore: sanctionsCheck.isSanctioned ? 90 : Math.floor(Math.random() * 100),
      riskFactors: sanctionsCheck.isSanctioned 
        ? ["Sanctions Match", "High Risk Entity"]
        : ["Normal Activity"],
      transactionVolume: Math.random() * 1000000,
      lastActivity: new Date().toISOString(),
      sanctionsCheck: sanctionsCheck,
      riskHistory: [
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          score: Math.floor(Math.random() * 100),
          reason: "Regular activity",
        },
        {
          date: new Date().toISOString(),
          score: sanctionsCheck.isSanctioned ? 90 : Math.floor(Math.random() * 100),
          reason: sanctionsCheck.isSanctioned ? "Sanctions match detected" : "Current assessment",
        },
      ],
    };

    res.json(riskProfile);
  } catch (error) {
    console.error("Error getting wallet risk profile:", error);
    res.status(500).json({
      error: "Failed to get wallet risk profile",
      message: error.message,
    });
  }
};

const getWalletAnalysis = (req, res) => res.json({ message: "getWalletAnalysis placeholder" });
const getWalletTokenHoldings = (req, res) => res.json({ message: "getWalletTokenHoldings placeholder" });
const getWalletInternalTransactions = (req, res) => res.json({ message: "getWalletInternalTransactions placeholder" });
const getContractABI = (req, res) => res.json({ message: "getContractABI placeholder" });
const getApiStatus = (req, res) => res.json({ status: "ok" });
const searchWallets = (req, res) => res.json([]);
const getWalletRiskAssessment = (req, res) => res.json({ message: "getWalletRiskAssessment placeholder" });

module.exports = {
  searchWallet,
  getWalletTransactions,
  getWalletRiskProfile,
  getWalletAnalysis,
  getWalletTokenHoldings,
  getWalletInternalTransactions,
  getContractABI,
  getApiStatus,
  searchWallets,
  getWalletRiskAssessment,
}; 