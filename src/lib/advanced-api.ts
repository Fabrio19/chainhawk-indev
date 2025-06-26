// Advanced compliance API functions
import {
  TravelRuleMessage,
  VASPInfo,
  GraphData,
  GraphNode,
  GraphEdge,
  WalletRiskHistory,
  RiskScoreHistoryPoint,
  MonitoringRule,
  WatchlistEntry,
  CaseNote,
  CaseAttachment,
  EntityRiskProfile,
  DarknetDetection,
  CounterpartyExposure,
  FiatRampRisk,
  TravelRuleCompliance,
} from "./advanced-types";
import { ComplianceCase } from "./types";

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock data generators
export const generateMockGraphData = (walletAddress: string): GraphData => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Central wallet node
  nodes.push({
    id: walletAddress,
    label: `${walletAddress.slice(0, 8)}...`,
    type: "wallet",
    riskScore: Math.random() * 100,
    position: { x: 0, y: 0 },
    metadata: { isTarget: true },
  });

  // Generate connected nodes
  for (let i = 0; i < 15; i++) {
    const nodeId = `0x${Math.random().toString(16).substr(2, 40)}`;
    const nodeType = ["wallet", "exchange", "mixer", "entity"][
      Math.floor(Math.random() * 4)
    ] as any;

    nodes.push({
      id: nodeId,
      label: `${nodeId.slice(0, 8)}...`,
      type: nodeType,
      riskScore: Math.random() * 100,
      position: {
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
      },
      metadata: {
        balance: Math.random() * 1000,
        transactionCount: Math.floor(Math.random() * 100),
      },
    });

    // Create edge to central node
    edges.push({
      id: `${walletAddress}-${nodeId}`,
      source: Math.random() > 0.5 ? walletAddress : nodeId,
      target: Math.random() > 0.5 ? nodeId : walletAddress,
      type: "transaction",
      amount: Math.random() * 100,
      timestamp: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      riskFlags: Math.random() > 0.7 ? ["high-frequency"] : [],
      weight: Math.random(),
    });
  }

  // Add some interconnections
  for (let i = 0; i < 5; i++) {
    const source = nodes[Math.floor(Math.random() * nodes.length)];
    const target = nodes[Math.floor(Math.random() * nodes.length)];
    if (source.id !== target.id) {
      edges.push({
        id: `${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
        type: "transaction",
        amount: Math.random() * 50,
        riskFlags: [],
        weight: Math.random() * 0.5,
      });
    }
  }

  return {
    nodes,
    edges,
    statistics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      riskDistribution: {
        low: nodes.filter((n) => n.riskScore < 30).length,
        medium: nodes.filter((n) => n.riskScore >= 30 && n.riskScore < 70)
          .length,
        high: nodes.filter((n) => n.riskScore >= 70).length,
      },
      entityTypes: {
        wallet: nodes.filter((n) => n.type === "wallet").length,
        exchange: nodes.filter((n) => n.type === "exchange").length,
        mixer: nodes.filter((n) => n.type === "mixer").length,
        entity: nodes.filter((n) => n.type === "entity").length,
      },
    },
  };
};

// Travel Rule API
export const getTravelRuleMessages = async (): Promise<TravelRuleMessage[]> => {
  await delay(500);
  return Array.from({ length: 3 }, (_, i) => ({
    id: `TR-${String(i + 1).padStart(3, "0")}`,
    messageType: ["inquiry", "response", "callback"][
      Math.floor(Math.random() * 3)
    ] as any,
    originatorVASP: {
      id: "VASP-001",
      name: "Indian Crypto Exchange",
      jurisdiction: "IN",
      publicKey: "0x1234...",
      endpoint: "https://vasp1.example.com",
      license: "FIU-IND-001",
      isVerified: true,
    },
    beneficiaryVASP: {
      id: "VASP-002",
      name: "Singapore Digital Asset Exchange",
      jurisdiction: "SG",
      publicKey: "0x5678...",
      endpoint: "https://vasp2.example.com",
      license: "MAS-002",
      isVerified: true,
    },
    transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    amount: Math.random() * 100000,
    currency: "USDT",
    threshold: 1000,
    originatorInfo: {
      name: "Rajesh Kumar",
      walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      accountReference: "ACC-001",
    },
    beneficiaryInfo: {
      name: "Li Wei",
      walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      accountReference: "ACC-002",
    },
    status: ["pending", "completed", "rejected"][
      Math.floor(Math.random() * 3)
    ] as any,
    timestamp: new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    encryptionMethod: "AES-256",
    complianceVerified: Math.random() > 0.3,
  }));
};

// Graph Visualization API
export const getTransactionGraph = async (
  walletAddress: string,
): Promise<GraphData> => {
  await delay(1000);
  return generateMockGraphData(walletAddress);
};

// Risk History API
export const getWalletRiskHistory = async (
  walletAddress: string,
): Promise<WalletRiskHistory> => {
  await delay(600);

  const history: RiskScoreHistoryPoint[] = [];
  let currentScore = 20 + Math.random() * 60;

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Add some volatility
    currentScore += (Math.random() - 0.5) * 10;
    currentScore = Math.max(0, Math.min(100, currentScore));

    // Occasional significant events
    if (Math.random() > 0.9) {
      currentScore += (Math.random() - 0.5) * 30;
      currentScore = Math.max(0, Math.min(100, currentScore));
    }

    history.push({
      timestamp: date.toISOString(),
      riskScore: Math.round(currentScore),
      reason: [
        "Regular transaction pattern",
        "High-value transaction detected",
        "Connection to flagged entity",
        "Mixing service interaction",
        "Normal activity",
      ][Math.floor(Math.random() * 5)],
      evidence: ["Transaction volume analysis", "Network analysis"],
      triggeredBy: ["transaction", "entity_update", "behavior_analysis"][
        Math.floor(Math.random() * 3)
      ] as any,
      confidence: 80 + Math.random() * 20,
    });
  }

  const scores = history.map((h) => h.riskScore);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  return {
    walletAddress,
    history,
    trends: {
      direction:
        scores[scores.length - 1] > scores[0]
          ? "increasing"
          : scores[scores.length - 1] < scores[0]
            ? "decreasing"
            : "stable",
      velocity: Math.abs(scores[scores.length - 1] - scores[0]) / scores.length,
      volatility:
        scores.reduce(
          (acc, score, i) =>
            i > 0 ? acc + Math.abs(score - scores[i - 1]) : acc,
          0,
        ) /
        (scores.length - 1),
    },
    milestones: {
      firstSeen: history[0].timestamp,
      highestRisk: history.find((h) => h.riskScore === maxScore)!,
      lowestRisk: history.find((h) => h.riskScore === minScore)!,
      significantChanges: history.filter((h, i) =>
        i > 0 ? Math.abs(h.riskScore - history[i - 1].riskScore) > 15 : false,
      ),
    },
  };
};

// Monitoring API
export const getMonitoringRules = async (): Promise<MonitoringRule[]> => {
  await delay(400);
  return Array.from({ length: 5 }, (_, i) => ({
    id: `RULE-${String(i + 1).padStart(3, "0")}`,
    name: [
      "High Value Transaction Alert",
      "Mixer Service Detection",
      "Rapid Transaction Velocity",
      "Sanction List Match",
      "PEP Interaction Alert",
    ][i],
    description: [
      "Triggers when transaction exceeds 50 ETH",
      "Detects interaction with known mixing services",
      "Alerts on >10 transactions within 1 hour",
      "Immediate alert for sanction list matches",
      "Enhanced monitoring for PEP interactions",
    ][i],
    ruleType: ["threshold", "entity", "velocity", "pattern", "entity"][
      i
    ] as any,
    isActive: Math.random() > 0.2,
    conditions: [
      {
        metric: "transaction_amount",
        operator: ">",
        value: 50,
      },
    ],
    actions: [
      {
        type: "alert",
        severity: ["medium", "high", "high", "critical", "medium"][i] as any,
        recipients: ["analyst@company.com"],
      },
    ],
    triggerCount: Math.floor(Math.random() * 50),
    createdBy: `analyst${i + 1}`,
    createdAt: new Date(
      Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  }));
};

export const getWatchlist = async (): Promise<WatchlistEntry[]> => {
  await delay(400);
  return Array.from({ length: 8 }, (_, i) => ({
    id: `WATCH-${String(i + 1).padStart(3, "0")}`,
    walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
    entityName:
      Math.random() > 0.5
        ? ["Suspicious Entity", "High Risk Individual", "Under Investigation"][
            Math.floor(Math.random() * 3)
          ]
        : undefined,
    addedBy: `analyst${Math.floor(Math.random() * 3) + 1}`,
    addedAt: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    reason: [
      "Linked to sanctioned entity",
      "Unusual transaction patterns",
      "PEP connection identified",
      "High-risk geography",
      "Mixer service usage",
    ][Math.floor(Math.random() * 5)],
    category: ["sanctions", "high_risk", "investigation", "pep"][
      Math.floor(Math.random() * 4)
    ] as any,
    priority: ["low", "medium", "high", "critical"][
      Math.floor(Math.random() * 4)
    ] as any,
    isActive: Math.random() > 0.2,
    rules: [],
    alertCount: Math.floor(Math.random() * 10),
  }));
};

// Case Notes API
export const getCaseNotes = async (caseId: string): Promise<CaseNote[]> => {
  await delay(300);
  return Array.from({ length: 5 }, (_, i) => ({
    id: `NOTE-${String(i + 1).padStart(3, "0")}`,
    caseId,
    authorId: `analyst${i + 1}`,
    authorName: `Analyst ${i + 1}`,
    content: [
      "Initial investigation commenced. Wallet shows high-frequency transactions to known exchange.",
      "Connected wallet to mixing service detected. Escalating risk level.",
      "PEP connection confirmed through entity clustering analysis.",
      "Preparing STR for submission to FIU-IND based on accumulated evidence.",
      "Case closed. Subject voluntarily provided source of funds documentation.",
    ][i],
    type: ["text", "analysis", "escalation", "decision", "text"][i] as any,
    isPrivate: false,
    timestamp: new Date(
      Date.now() - (5 - i) * 24 * 60 * 60 * 1000,
    ).toISOString(),
    attachments: [],
    mentions: [],
    tags: [
      ["investigation", "high-priority"],
      ["mixing", "risk-escalation"],
      ["pep", "entity-clustering"],
      ["str", "fiu-ind"],
      ["closed", "documentation"],
    ][i],
  }));
};

// Entity Risk Profiles API
export const getEntityRiskProfiles = async (): Promise<EntityRiskProfile[]> => {
  await delay(700);
  return Array.from({ length: 4 }, (_, i) => ({
    entityId: `ENTITY-${String(i + 1).padStart(3, "0")}`,
    entityName: [
      "Rajesh Kumar",
      "TechCorp Solutions Pvt Ltd",
      "Crypto Investment Fund",
      "Anonymous High-Risk Entity",
    ][i],
    entityType: ["individual", "business", "institution", "individual"][
      i
    ] as any,
    kycLevel: ["enhanced", "standard", "basic", "none"][i] as any,
    linkedWallets: Array.from(
      { length: Math.floor(Math.random() * 5) + 1 },
      () => `0x${Math.random().toString(16).substr(2, 40)}`,
    ),
    aggregateRiskScore: [25, 45, 70, 95][i],
    riskFactors: {
      transactionVolume: Math.random() * 100,
      geographicRisk: [20, 30, 60, 90][i],
      counterpartyRisk: [15, 40, 75, 95][i],
      behaviorRisk: [30, 50, 65, 85][i],
      complianceHistory: [90, 80, 60, 20][i],
    },
    exposures: {
      totalVolume: Math.random() * 1000000,
      highRiskVolume: Math.random() * 100000,
      sanctionedVolume: i === 3 ? Math.random() * 50000 : 0,
      mixerVolume: [0, 5000, 25000, 75000][i],
      exchangeVolume: Math.random() * 500000,
    },
    relationships: [],
    complianceStatus: [
      "compliant",
      "monitoring",
      "investigation",
      "restricted",
    ][i] as any,
    lastReview: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    nextReview: new Date(
      Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  }));
};

// Darknet Detection API
export const getDarknetDetections = async (): Promise<DarknetDetection[]> => {
  await delay(800);
  return Array.from({ length: 6 }, (_, i) => ({
    walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
    detectionType: ["mixer", "bridge", "darknet_market", "privacy_coin"][
      Math.floor(Math.random() * 4)
    ] as any,
    serviceName: [
      "Tornado Cash",
      "ChipMixer",
      "Silk Road 3.0",
      "Hydra Market",
      "Privacy Bridge",
      "Tumbler Service",
    ][i],
    confidence: 80 + Math.random() * 20,
    evidence: {
      transactionHashes: Array.from(
        { length: 3 },
        () => `0x${Math.random().toString(16).substr(2, 64)}`,
      ),
      patterns: ["Sequential deposits", "Round amounts", "Timing patterns"],
      indicators: ["Known service address", "Transaction pattern match"],
    },
    riskLevel: ["medium", "high", "critical", "high", "medium", "critical"][
      i
    ] as any,
    firstDetected: new Date(
      Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    lastDetected: new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    associatedServices: ["TornadoCash", "ChipMixer"].filter(
      () => Math.random() > 0.5,
    ),
  }));
};

// Counterparty Exposure API
export const getCounterpartyExposure = async (
  entityId: string,
): Promise<CounterpartyExposure> => {
  await delay(600);

  const counterparties = Array.from({ length: 8 }, (_, i) => ({
    name: [
      "Binance",
      "Tornado Cash",
      "Unknown Mixer",
      "Coinbase",
      "Uniswap",
      "High-Risk Entity",
      "WazirX",
      "Sanctioned Wallet",
    ][i],
    type: [
      "exchange",
      "mixer",
      "mixer",
      "exchange",
      "defi",
      "other",
      "exchange",
      "other",
    ][i] as any,
    riskLevel: [
      "low",
      "critical",
      "high",
      "low",
      "medium",
      "high",
      "medium",
      "critical",
    ][i] as any,
    volumeReceived: Math.random() * 100000,
    volumeSent: Math.random() * 100000,
    transactionCount: Math.floor(Math.random() * 50) + 1,
    firstInteraction: new Date(
      Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    lastInteraction: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    percentage: Math.random() * 30,
  }));

  const totalVolume = counterparties.reduce(
    (sum, cp) => sum + cp.volumeReceived + cp.volumeSent,
    0,
  );

  return {
    entityId,
    counterparties: counterparties.map((cp) => ({
      ...cp,
      percentage: ((cp.volumeReceived + cp.volumeSent) / totalVolume) * 100,
    })),
    summary: {
      totalVolume,
      highRiskPercentage:
        (counterparties
          .filter(
            (cp) => cp.riskLevel === "high" || cp.riskLevel === "critical",
          )
          .reduce((sum, cp) => sum + cp.volumeReceived + cp.volumeSent, 0) /
          totalVolume) *
        100,
      mixerExposure: counterparties
        .filter((cp) => cp.type === "mixer")
        .reduce((sum, cp) => sum + cp.volumeReceived + cp.volumeSent, 0),
      sanctionedExposure: counterparties
        .filter((cp) => cp.name === "Sanctioned Wallet")
        .reduce((sum, cp) => sum + cp.volumeReceived + cp.volumeSent, 0),
      exchangeExposure: counterparties
        .filter((cp) => cp.type === "exchange")
        .reduce((sum, cp) => sum + cp.volumeReceived + cp.volumeSent, 0),
    },
    trends: {
      direction: ["increasing", "decreasing", "stable"][
        Math.floor(Math.random() * 3)
      ] as any,
      monthlyChange: (Math.random() - 0.5) * 40,
    },
  };
};

// Fiat Ramp Risk API
export const getFiatRampRisk = async (
  walletAddress: string,
): Promise<FiatRampRisk> => {
  await delay(700);
  return {
    linkageId: `FIAT-${Math.random().toString(36).substr(2, 8)}`,
    walletAddress,
    fiatTransfers: Array.from({ length: 5 }, (_, i) => ({
      bankAccount: `XXXX${Math.floor(Math.random() * 10000)}`,
      bankName: ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Bank"][
        Math.floor(Math.random() * 5)
      ],
      ifscCode: `${["HDFC", "ICIC", "SBIN", "UTIB", "KKBK"][Math.floor(Math.random() * 5)]}0001234`,
      amount: Math.random() * 1000000,
      currency: "INR" as const,
      direction: Math.random() > 0.5 ? "deposit" : "withdrawal",
      timestamp: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      referenceNumber: `UTR${Math.random().toString().substr(2, 12)}`,
      method: ["bank_transfer", "upi", "imps", "neft"][
        Math.floor(Math.random() * 4)
      ] as any,
    })),
    riskIndicators: {
      structuredTransactions: Math.random() > 0.7,
      rapidSuccession: Math.random() > 0.8,
      roundAmounts: Math.random() > 0.6,
      multipleAccounts: Math.random() > 0.5,
      highVelocity: Math.random() > 0.7,
      crossBorderIndicators: Math.random() > 0.9,
    },
    complianceChecks: {
      cddCompleted: Math.random() > 0.2,
      sourceOfFundsVerified: Math.random() > 0.3,
      pepCheck: Math.random() > 0.1,
      sanctionCheck: Math.random() > 0.1,
      amlScore: Math.floor(Math.random() * 100),
    },
    riskScore: Math.floor(Math.random() * 100),
    regulatoryFlags: [
      "High cash transaction volume",
      "Multiple bank accounts",
      "Rapid transaction succession",
    ].filter(() => Math.random() > 0.6),
  };
};

// Travel Rule Compliance API
export const getTravelRuleCompliance =
  async (): Promise<TravelRuleCompliance> => {
    await delay(400);
    return {
      isEnabled: true,
      thresholdAmount: 1000,
      supportedJurisdictions: ["US", "EU", "SG", "JP", "IN", "UK"],
      vaspRegistry: [
        {
          id: "VASP-001",
          name: "Indian Crypto Exchange",
          jurisdiction: "IN",
          publicKey: "0x1234...",
          endpoint: "https://vasp1.example.com",
          license: "FIU-IND-001",
          isVerified: true,
        },
        {
          id: "VASP-002",
          name: "Singapore Digital Asset Exchange",
          jurisdiction: "SG",
          publicKey: "0x5678...",
          endpoint: "https://vasp2.example.com",
          license: "MAS-002",
          isVerified: true,
        },
      ],
      pendingInquiries: [],
      completedTransfers: [],
      complianceRate: 94.5,
      averageResponseTime: 24.3,
    };
  };

// Compliance Cases API (re-exported for compatibility)
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
