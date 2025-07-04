// Real API functions for blockchain compliance platform
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
import { getApiBaseUrl } from "./apiConfig";

const API_BASE_URL = getApiBaseUrl();

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

// Helper function for delays (for mock data)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Real API functions
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    // Return default stats if API fails
    return {
      totalWallets: 0,
      highRiskWallets: 0,
      todayTransactions: 0,
      suspiciousTransactions: 0,
      openCases: 0,
      pendingReports: 0,
      activeAlerts: 0,
      complianceScore: 0,
    };
  }
};

export const searchWallet = async (address: string): Promise<Wallet> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallets/${address}`, {
      headers: getAuthHeaders(),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to search wallet:', error);
    throw error;
  }
};

export const getWalletTransactions = async (
  address: string,
): Promise<Transaction[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallets/${address}/transactions`, {
      headers: getAuthHeaders(),
    });
    const data = await handleApiResponse(response);
    // Transform the backend response to match frontend Transaction type
    return data.data?.transactions?.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      amount: parseFloat(tx.valueFormatted) || 0,
      currency: 'ETH',
      timestamp: new Date(tx.timestamp * 1000).toISOString(),
      chain: tx.chain || 'ethereum',
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed,
      riskFlags: [],
      category: 'normal' as any,
    })) || [];
  } catch (error) {
    console.error('Failed to fetch wallet transactions:', error);
    return [];
  }
};

export const performSanctionScreening = async (
  address: string,
): Promise<SanctionHit[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sanctions/screen/${address}`, {
      headers: getAuthHeaders(),
    });
    const data = await handleApiResponse(response);
    // Transform the backend response to match frontend SanctionHit type
    return data.map((hit: any) => ({
      address,
      sanctionList: hit.sanctionList,
      matchType: 'exact',
      confidence: 95,
      entity: hit.entityName || 'Unknown',
      reason: hit.description || 'Sanction match found',
      dateAdded: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to perform sanction screening:', error);
    return [];
  }
};

export const performPEPScreening = async (
  name: string,
): Promise<PEPRecord[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pep/screen`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to perform PEP screening:', error);
    return [];
  }
};

export const getComplianceCases = async (): Promise<ComplianceCase[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`, {
      headers: getAuthHeaders(),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch compliance cases:', error);
    return [];
  }
};

export const getActiveAlerts = async (): Promise<Alert[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts`, {
      headers: getAuthHeaders(),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch active alerts:', error);
    return [];
  }
};

export const getRegulatoryReports = async (): Promise<RegulatoryReport[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      headers: getAuthHeaders(),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch regulatory reports:', error);
    return [];
  }
};

export const getBlockchainNetworks = async (): Promise<BlockchainNetwork[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/networks`, {
      headers: getAuthHeaders(),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch blockchain networks:', error);
    return [];
  }
};

export const getAPIIntegrations = async (): Promise<APIIntegration[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/integrations`, {
      headers: getAuthHeaders(),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch API integrations:', error);
    return [];
  }
};

export const traceTransaction = async (
  hash: string,
  depth: number = 3,
): Promise<Transaction[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tracing/advanced/${hash}?depth=${depth}`, {
      headers: getAuthHeaders(),
    });
    const data = await handleApiResponse(response);
    
    // Transform the advanced tracer response to match frontend Transaction type
    if (data.success && data.flat) {
      return data.flat.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        amount: parseFloat(tx.amount) || 0,
        currency: tx.token || 'ETH',
        timestamp: tx.time || new Date().toISOString(),
        chain: tx.chain || 'ethereum',
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed,
        riskFlags: tx.riskTags || [],
        category: tx.riskLevel > 70 ? 'suspicious' : 'normal' as any,
        depth: tx.depth,
        riskLevel: tx.riskLevel,
        direction: tx.direction,
        isCrossChain: tx.isCrossChain,
        bridgeName: tx.bridgeName,
      }));
    }
    
    // Fallback to old endpoint if advanced tracer fails
    const fallbackResponse = await fetch(`${API_BASE_URL}/tracing/trace/${hash}?depth=${depth}`, {
      headers: getAuthHeaders(),
    });
    const fallbackData = await handleApiResponse(fallbackResponse);
    return fallbackData.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      amount: parseFloat(tx.valueFormatted) || 0,
      currency: 'ETH',
      timestamp: new Date(tx.timestamp * 1000).toISOString(),
      chain: tx.chain || 'ethereum',
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed,
      riskFlags: [],
      category: 'normal' as any,
    }));
  } catch (error) {
    console.error('Failed to trace transaction:', error);
    return [];
  }
};

export const getEntityClusters = async (): Promise<EntityCluster[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/clusters`, {
      headers: getAuthHeaders(),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch entity clusters:', error);
    return [];
  }
};

export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/audit/logs`, {
      headers: getAuthHeaders(),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
};

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
