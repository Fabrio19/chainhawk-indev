// Mock API functions for blockchain compliance platform
import {
  Wallet,
  Transaction,
  SanctionHit,
  PEPRecord,
  ComplianceCase,
  Alert,
  RegulatoryReport,
  DashboardStats,
  BlockchainNetwork,
  EntityCluster,
  AuditLogEntry,
  APIIntegration,
} from "./types";

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock data generators
export const generateMockWallet = (): Wallet => ({
  address: `0x${Math.random().toString(16).substr(2, 40)}`,
  chain: ["ethereum", "bitcoin", "polygon", "bsc"][
    Math.floor(Math.random() * 4)
  ],
  balance: Math.random() * 1000000,
  riskScore: Math.floor(Math.random() * 100),
  lastActivity: new Date(
    Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
  ).toISOString(),
  labels: ["Exchange", "DeFi", "Mixer", "Personal"][
    Math.floor(Math.random() * 4)
  ]
    ? [["Exchange", "DeFi", "Mixer", "Personal"][Math.floor(Math.random() * 4)]]
    : [],
  isBlacklisted: Math.random() > 0.9,
  entityType: ["exchange", "mixer", "defi", "individual", "unknown"][
    Math.floor(Math.random() * 5)
  ] as any,
});

export const generateMockTransaction = (): Transaction => ({
  hash: `0x${Math.random().toString(16).substr(2, 64)}`,
  from: `0x${Math.random().toString(16).substr(2, 40)}`,
  to: `0x${Math.random().toString(16).substr(2, 40)}`,
  amount: Math.random() * 10000,
  currency: ["ETH", "BTC", "USDT", "USDC"][Math.floor(Math.random() * 4)],
  timestamp: new Date(
    Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
  ).toISOString(),
  chain: ["ethereum", "bitcoin", "polygon"][Math.floor(Math.random() * 3)],
  blockNumber: Math.floor(Math.random() * 1000000),
  gasUsed: Math.floor(Math.random() * 100000),
  riskFlags: Math.random() > 0.7 ? ["high-frequency", "unusual-amount"] : [],
  category: Math.random() > 0.8 ? "suspicious" : ("normal" as any),
});

// API functions
export const getDashboardStats = async (): Promise<DashboardStats> => {
  await delay(500);
  return {
    totalWallets: 45678,
    highRiskWallets: 234,
    todayTransactions: 12456,
    suspiciousTransactions: 89,
    openCases: 23,
    pendingReports: 5,
    activeAlerts: 12,
    complianceScore: 87,
  };
};

export const searchWallet = async (address: string): Promise<Wallet> => {
  await delay(800);
  return {
    ...generateMockWallet(),
    address,
  };
};

export const getWalletTransactions = async (
  address: string,
): Promise<Transaction[]> => {
  await delay(600);
  return Array.from({ length: 10 }, () => ({
    ...generateMockTransaction(),
    from: Math.random() > 0.5 ? address : generateMockTransaction().from,
    to: Math.random() > 0.5 ? address : generateMockTransaction().to,
  }));
};

export const performSanctionScreening = async (
  address: string,
): Promise<SanctionHit[]> => {
  await delay(1200);
  if (Math.random() > 0.9) {
    return [
      {
        address,
        sanctionList: "OFAC",
        matchType: "exact",
        confidence: 95,
        entity: "Darkweb Market Operator",
        reason: "Money laundering activities",
        dateAdded: "2024-01-15",
      },
    ];
  }
  return [];
};

export const performPEPScreening = async (
  name: string,
): Promise<PEPRecord[]> => {
  await delay(1000);
  if (Math.random() > 0.8) {
    return [
      {
        name,
        country: "India",
        position: "Former Minister of Finance",
        riskLevel: "high",
        lastUpdated: "2024-01-20",
        sourceOfWealth: "Political position, business interests",
        politicalExposure: "High - Former cabinet minister",
      },
    ];
  }
  return [];
};

export const getComplianceCases = async (): Promise<ComplianceCase[]> => {
  await delay(700);
  return Array.from({ length: 8 }, (_, i) => ({
    id: `CASE-${String(i + 1).padStart(3, "0")}`,
    title: `Investigation ${i + 1}: Suspicious Transaction Pattern`,
    description:
      "Multiple high-value transactions to known high-risk wallets detected",
    priority: ["low", "medium", "high", "critical"][
      Math.floor(Math.random() * 4)
    ] as any,
    status: ["open", "investigating", "resolved", "closed"][
      Math.floor(Math.random() * 4)
    ] as any,
    assignedTo: `Analyst ${i + 1}`,
    createdAt: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    updatedAt: new Date().toISOString(),
    relatedWallets: [`0x${Math.random().toString(16).substr(2, 40)}`],
    findings: ["High transaction frequency", "Connection to mixer services"],
    actions: [],
  }));
};

export const getActiveAlerts = async (): Promise<Alert[]> => {
  await delay(400);
  return Array.from({ length: 6 }, (_, i) => ({
    id: `ALERT-${String(i + 1).padStart(3, "0")}`,
    type: ["transaction", "wallet", "sanction", "pep", "behavior"][
      Math.floor(Math.random() * 5)
    ] as any,
    severity: ["low", "medium", "high", "critical"][
      Math.floor(Math.random() * 4)
    ] as any,
    title: `Alert ${i + 1}: Suspicious Activity Detected`,
    description:
      "Automated system detected potentially suspicious transaction pattern",
    relatedAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
    timestamp: new Date(
      Date.now() - Math.random() * 24 * 60 * 60 * 1000,
    ).toISOString(),
    status: ["new", "acknowledged", "investigating", "resolved"][
      Math.floor(Math.random() * 4)
    ] as any,
    autoGenerated: true,
  }));
};

export const getRegulatoryReports = async (): Promise<RegulatoryReport[]> => {
  await delay(600);
  return Array.from({ length: 5 }, (_, i) => ({
    id: `RPT-${String(i + 1).padStart(3, "0")}`,
    type: ["STR", "CTR", "SAR"][Math.floor(Math.random() * 3)] as any,
    regulatorCode: ["FIU-IND", "SEBI", "RBI"][
      Math.floor(Math.random() * 3)
    ] as any,
    status: ["draft", "submitted", "accepted", "rejected"][
      Math.floor(Math.random() * 4)
    ] as any,
    submissionDate: Math.random() > 0.5 ? new Date().toISOString() : undefined,
    reportingPeriod: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    },
    totalTransactions: Math.floor(Math.random() * 10000),
    suspiciousTransactions: Math.floor(Math.random() * 100),
    attachments: [],
  }));
};

export const getBlockchainNetworks = async (): Promise<BlockchainNetwork[]> => {
  await delay(300);
  return [
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
  ];
};

export const getAPIIntegrations = async (): Promise<APIIntegration[]> => {
  await delay(400);
  return [
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
    {
      id: "coinbase",
      name: "Coinbase",
      type: "exchange",
      status: "error",
      endpoint: "https://api.coinbase.com",
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      apiKey: "cb_****_****",
      rateLimitRemaining: 0,
    },
  ];
};

export const traceTransaction = async (
  hash: string,
): Promise<Transaction[]> => {
  await delay(1500);
  return Array.from({ length: 5 }, () => generateMockTransaction());
};

export const getEntityClusters = async (): Promise<EntityCluster[]> => {
  await delay(800);
  return Array.from({ length: 4 }, (_, i) => ({
    clusterId: `CLUSTER-${String(i + 1).padStart(3, "0")}`,
    entityType: ["Exchange", "Mixer", "DeFi Protocol", "Mining Pool"][i],
    confidence: 85 + Math.random() * 15,
    wallets: Array.from(
      { length: Math.floor(Math.random() * 10) + 1 },
      () => `0x${Math.random().toString(16).substr(2, 40)}`,
    ),
    totalVolume: Math.random() * 10000000,
    riskScore: Math.floor(Math.random() * 100),
    labels: ["High Volume", "KYC Verified", "Institutional"].filter(
      () => Math.random() > 0.5,
    ),
    firstSeen: new Date(
      Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    lastActive: new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  }));
};

export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  await delay(500);
  return Array.from({ length: 20 }, (_, i) => ({
    id: `LOG-${String(i + 1).padStart(6, "0")}`,
    userId: `user${Math.floor(Math.random() * 10)}`,
    action: [
      "wallet_search",
      "report_generate",
      "case_update",
      "settings_change",
    ][Math.floor(Math.random() * 4)],
    resourceType: ["wallet", "case", "report", "settings"][
      Math.floor(Math.random() * 4)
    ],
    resourceId: `resource_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    result: Math.random() > 0.1 ? "success" : "failure",
  }));
};
