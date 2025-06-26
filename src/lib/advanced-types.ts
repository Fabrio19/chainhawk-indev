// Advanced compliance feature types

export interface TravelRuleMessage {
  id: string;
  messageType: "inquiry" | "response" | "callback";
  originatorVASP: VASPInfo;
  beneficiaryVASP: VASPInfo;
  transactionHash: string;
  amount: number;
  currency: string;
  threshold: number;
  originatorInfo: PersonInfo;
  beneficiaryInfo: PersonInfo;
  status: "pending" | "completed" | "rejected" | "expired";
  timestamp: string;
  encryptionMethod: string;
  complianceVerified: boolean;
}

export interface VASPInfo {
  id: string;
  name: string;
  jurisdiction: string;
  publicKey: string;
  endpoint: string;
  license: string;
  isVerified: boolean;
}

export interface PersonInfo {
  name?: string;
  walletAddress: string;
  accountReference?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  address?: AddressInfo;
  identification?: IdentificationInfo;
}

export interface AddressInfo {
  addressType: "residential" | "business" | "correspondence";
  department?: string;
  subDepartment?: string;
  streetName: string;
  buildingNumber: string;
  buildingName?: string;
  floor?: string;
  postBox?: string;
  room?: string;
  postCode: string;
  townName: string;
  townLocationName?: string;
  districtName?: string;
  countrySubDivision?: string;
  country: string;
}

export interface IdentificationInfo {
  identificationType: "passport" | "driving_license" | "national_id" | "tax_id";
  identificationNumber: string;
  issuingCountry?: string;
  issuingAuthority?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "wallet" | "transaction" | "entity" | "exchange" | "mixer" | "bridge";
  riskScore: number;
  amount?: number;
  timestamp?: string;
  metadata: Record<string, any>;
  position: { x: number; y: number };
  fixed?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "transaction" | "control" | "cluster" | "suspected";
  amount?: number;
  timestamp?: string;
  riskFlags: string[];
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: {
    totalNodes: number;
    totalEdges: number;
    riskDistribution: Record<string, number>;
    entityTypes: Record<string, number>;
  };
}

export interface RiskScoreHistoryPoint {
  timestamp: string;
  riskScore: number;
  reason: string;
  evidence: string[];
  triggeredBy:
    | "transaction"
    | "entity_update"
    | "sanction_list"
    | "behavior_analysis";
  confidence: number;
}

export interface WalletRiskHistory {
  walletAddress: string;
  history: RiskScoreHistoryPoint[];
  trends: {
    direction: "increasing" | "decreasing" | "stable";
    velocity: number;
    volatility: number;
  };
  milestones: {
    firstSeen: string;
    highestRisk: RiskScoreHistoryPoint;
    lowestRisk: RiskScoreHistoryPoint;
    significantChanges: RiskScoreHistoryPoint[];
  };
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  ruleType: "threshold" | "velocity" | "pattern" | "entity" | "geographic";
  isActive: boolean;
  conditions: {
    metric: string;
    operator: ">" | "<" | "=" | "!=" | "contains" | "matches";
    value: any;
    timeWindow?: string;
  }[];
  actions: {
    type: "alert" | "case" | "report" | "webhook";
    severity: "low" | "medium" | "high" | "critical";
    recipients: string[];
    template?: string;
  }[];
  lastTriggered?: string;
  triggerCount: number;
  createdBy: string;
  createdAt: string;
}

export interface WatchlistEntry {
  id: string;
  walletAddress: string;
  entityName?: string;
  addedBy: string;
  addedAt: string;
  reason: string;
  category: "sanctions" | "pep" | "high_risk" | "investigation" | "internal";
  priority: "low" | "medium" | "high" | "critical";
  isActive: boolean;
  rules: MonitoringRule[];
  lastActivity?: string;
  alertCount: number;
}

export interface CaseNote {
  id: string;
  caseId: string;
  authorId: string;
  authorName: string;
  content: string;
  type: "text" | "analysis" | "decision" | "escalation";
  isPrivate: boolean;
  timestamp: string;
  attachments: CaseAttachment[];
  mentions: string[];
  tags: string[];
}

export interface CaseAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
  isEvidence: boolean;
  hash: string; // File integrity hash
  category: "document" | "screenshot" | "report" | "communication" | "evidence";
}

export interface EntityRiskProfile {
  entityId: string;
  entityName: string;
  entityType: "individual" | "business" | "exchange" | "institution";
  kycLevel: "basic" | "standard" | "enhanced" | "none";
  linkedWallets: string[];
  aggregateRiskScore: number;
  riskFactors: {
    transactionVolume: number;
    geographicRisk: number;
    counterpartyRisk: number;
    behaviorRisk: number;
    complianceHistory: number;
  };
  exposures: {
    totalVolume: number;
    highRiskVolume: number;
    sanctionedVolume: number;
    mixerVolume: number;
    exchangeVolume: number;
  };
  relationships: EntityRelationship[];
  complianceStatus: "compliant" | "monitoring" | "investigation" | "restricted";
  lastReview: string;
  nextReview: string;
}

export interface EntityRelationship {
  relatedEntityId: string;
  relationshipType:
    | "control"
    | "beneficial_owner"
    | "family"
    | "business_partner"
    | "same_person";
  confidence: number;
  evidence: string[];
  establishedDate: string;
}

export interface DarknetDetection {
  walletAddress: string;
  detectionType:
    | "mixer"
    | "bridge"
    | "darknet_market"
    | "privacy_coin"
    | "tumbler";
  serviceName?: string;
  confidence: number;
  evidence: {
    transactionHashes: string[];
    patterns: string[];
    indicators: string[];
  };
  riskLevel: "low" | "medium" | "high" | "critical";
  firstDetected: string;
  lastDetected: string;
  associatedServices: string[];
}

export interface CounterpartyExposure {
  entityId: string;
  counterparties: {
    name: string;
    type: "exchange" | "mixer" | "darknet" | "defi" | "bridge" | "other";
    riskLevel: "low" | "medium" | "high" | "critical";
    volumeReceived: number;
    volumeSent: number;
    transactionCount: number;
    firstInteraction: string;
    lastInteraction: string;
    percentage: number;
  }[];
  summary: {
    totalVolume: number;
    highRiskPercentage: number;
    mixerExposure: number;
    sanctionedExposure: number;
    exchangeExposure: number;
  };
  trends: {
    direction: "increasing" | "decreasing" | "stable";
    monthlyChange: number;
  };
}

export interface FiatRampRisk {
  linkageId: string;
  walletAddress: string;
  fiatTransfers: {
    bankAccount: string;
    bankName: string;
    ifscCode?: string;
    upiId?: string;
    amount: number;
    currency: "INR";
    direction: "deposit" | "withdrawal";
    timestamp: string;
    referenceNumber: string;
    method: "bank_transfer" | "upi" | "imps" | "neft" | "rtgs";
  }[];
  riskIndicators: {
    structuredTransactions: boolean;
    rapidSuccession: boolean;
    roundAmounts: boolean;
    multipleAccounts: boolean;
    highVelocity: boolean;
    crossBorderIndicators: boolean;
  };
  complianceChecks: {
    cddCompleted: boolean;
    sourceOfFundsVerified: boolean;
    pepCheck: boolean;
    sanctionCheck: boolean;
    amlScore: number;
  };
  riskScore: number;
  regulatoryFlags: string[];
}

export interface TravelRuleCompliance {
  isEnabled: boolean;
  thresholdAmount: number;
  supportedJurisdictions: string[];
  vaspRegistry: VASPInfo[];
  pendingInquiries: TravelRuleMessage[];
  completedTransfers: TravelRuleMessage[];
  complianceRate: number;
  averageResponseTime: number;
}
