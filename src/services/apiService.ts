// API Service for backend communication
import { getApiBaseUrl } from "@/lib/apiConfig";

const API_BASE_URL = getApiBaseUrl();

// Types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "analyst" | "partner";
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  userId?: string;
  apiKeyId?: string;
  actionType: string;
  endpoint: string;
  httpMethod: string;
  requestPayload?: any;
  responseStatus: number;
  ipAddress: string;
  userAgent?: string;
  duration?: number;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

// API Service Class
class ApiService {
  getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return {
          success: false,
          error: data.error || "Request failed",
          code: data.code,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: "Failed to parse response",
      };
    }
  }

  // Authentication API
  async login(
    email: string,
    password: string,
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async getProfile(): Promise<ApiResponse<{ user: User; authMethod: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async generateApiKey(
    name: string = "Default API Key",
  ): Promise<
    ApiResponse<{ apiKey: string; name: string; keyPreview: string }>
  > {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/api-key`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ name }),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async revokeApiKey(): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/api-key`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  // User Management API (Admin only)
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<{ users: User[]; pagination: any }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.role) queryParams.set("role", params.role);
      if (params?.status) queryParams.set("status", params.status);
      if (params?.search) queryParams.set("search", params.search);

      const response = await fetch(`${API_BASE_URL}/users?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async getUser(
    userId: string,
  ): Promise<
    ApiResponse<{ user: User; apiKeys: any[]; recentActivity: AuditLog[] }>
  > {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async createUser(userData: {
    name: string;
    email: string;
    role: string;
    status?: string;
  }): Promise<ApiResponse<{ user: User; temporaryPassword: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<ApiResponse<{ user: User }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  // Audit Logs API
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
    ipAddress?: string;
    httpMethod?: string;
  }): Promise<ApiResponse<{ auditLogs: AuditLog[]; pagination: any }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.userId) queryParams.set("userId", params.userId);
      if (params?.actionType) queryParams.set("actionType", params.actionType);
      if (params?.startDate) queryParams.set("startDate", params.startDate);
      if (params?.endDate) queryParams.set("endDate", params.endDate);
      if (params?.ipAddress) queryParams.set("ipAddress", params.ipAddress);
      if (params?.httpMethod) queryParams.set("httpMethod", params.httpMethod);

      const response = await fetch(`${API_BASE_URL}/audit?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async getAuditLogStats(days?: number): Promise<ApiResponse<any>> {
    try {
      const queryParams = new URLSearchParams();
      if (days) queryParams.set("days", days.toString());

      const response = await fetch(
        `${API_BASE_URL}/audit/stats?${queryParams}`,
        {
          headers: this.getAuthHeaders(),
        },
      );

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch("http://localhost:3001/health");
      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Backend not reachable" };
    }
  }

  // Compliance Status
  async getComplianceStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/compliance/status`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  // Bridge Monitoring API
  async getBridgeTransactions(params?: {
    page?: number;
    limit?: number;
    protocol?: string;
    chain?: string;
    riskLevel?: string;
    search?: string;
  }): Promise<ApiResponse<{ transactions: any[]; pagination: any }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.protocol) queryParams.set("protocol", params.protocol);
      if (params?.chain) queryParams.set("chain", params.chain);
      if (params?.riskLevel) queryParams.set("riskLevel", params.riskLevel);
      if (params?.search) queryParams.set("search", params.search);

      const response = await fetch(`${API_BASE_URL}/bridges/transactions?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async getCrossChainLinks(params?: {
    page?: number;
    limit?: number;
    sourceChain?: string;
    destinationChain?: string;
    confidence?: string;
  }): Promise<ApiResponse<{ links: any[]; pagination: any }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.sourceChain) queryParams.set("sourceChain", params.sourceChain);
      if (params?.destinationChain) queryParams.set("destinationChain", params.destinationChain);
      if (params?.confidence) queryParams.set("confidence", params.confidence);

      const response = await fetch(`${API_BASE_URL}/bridges/crosschain-links?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async getWalletFlows(params?: {
    walletAddress?: string;
    chain?: string;
    flowType?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ flows: any[]; pagination: any }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.walletAddress) queryParams.set("walletAddress", params.walletAddress);
      if (params?.chain) queryParams.set("chain", params.chain);
      if (params?.flowType) queryParams.set("flowType", params.flowType);
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());

      const response = await fetch(`${API_BASE_URL}/bridges/wallet-flows?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async getBridgeStats(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/bridges/stats`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async getRiskAnalysis(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/bridges/risk-analysis`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async toggleMonitoringMode(useReal: boolean): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/bridges/toggle-mode`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ useReal }),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  async getMonitoringStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/bridges/status`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

export const getCases = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`, {
      headers: apiService.getAuthHeaders(),
    });

    // Check if response is HTML (error page) instead of JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn(
        "Backend returned HTML instead of JSON, falling back to mock data",
      );
      // Fallback to mock data when backend is not available
      return [];
    }

    if (!response.ok) {
      console.error(
        "Failed to fetch cases:",
        response.status,
        response.statusText,
      );
      // Fallback to mock data on error
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error("Error fetching cases:", error);
    // Fallback to mock data on network error
    try {
      return [];
    } catch (mockError) {
      console.error("Mock fallback also failed:", mockError);
      return [];
    }
  }
};

export const getCaseById = async (id: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${id}`, {
      headers: apiService.getAuthHeaders(),
    });

    if (!response.ok) {
      console.error(
        "Failed to fetch case:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to fetch case");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching case:", error);
    throw error;
  }
};

export const createCase = async (data: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`, {
      method: "POST",
      headers: {
        ...apiService.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    // Check for HTML response (backend not available)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("Backend not available, using mock response");
      // Return mock case data
      return {
        id: `CASE-${String(Date.now()).slice(-3)}`,
        title: `Investigation: ${data.wallet_address?.slice(0, 10)}...`,
        description: "New case created (mock)",
        priority: "medium",
        status: "open",
        assignedTo: data.assigned_to || "Current User",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relatedWallets: [data.wallet_address],
        findings: [],
        actions: [],
        ...data,
      };
    }

    if (!response.ok) {
      console.error(
        "Failed to create case:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to create case");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating case:", error);
    // Fallback to mock case creation
    return {
      id: `CASE-${String(Date.now()).slice(-3)}`,
      title: `Investigation: ${data.wallet_address?.slice(0, 10)}...`,
      description: "New case created (fallback)",
      priority: "medium",
      status: "open",
      assignedTo: data.assigned_to || "Current User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedWallets: [data.wallet_address],
      findings: [],
      actions: [],
      ...data,
    };
  }
};

export const updateCase = async (id: string, data: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${id}`, {
      method: "PATCH",
      headers: {
        ...apiService.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error(
        "Failed to update case:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to update case");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating case:", error);
    throw error;
  }
};

export const uploadEvidence = async (id: string, data: FormData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${id}/evidence`, {
      method: "POST",
      headers: apiService.getAuthHeaders(),
      body: data,
    });

    if (!response.ok) {
      console.error(
        "Failed to upload evidence:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to upload evidence");
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading evidence:", error);
    throw error;
  }
};

export const getEvidence = async (id: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${id}/evidence`, {
      headers: apiService.getAuthHeaders(),
    });

    if (!response.ok) {
      console.error(
        "Failed to fetch evidence:",
        response.status,
        response.statusText,
      );
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching evidence:", error);
    return [];
  }
};

export const downloadEvidence = async (caseId: string, evidenceId: string) => {
  const res = await fetch(
    `${API_BASE_URL}/cases/${caseId}/evidence/${evidenceId}/download`,
    {
      method: "GET",
      headers: apiService.getAuthHeaders(),
    },
  );
  return res.blob();
};

export const addAction = async (id: string, data: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${id}/actions`, {
      method: "POST",
      headers: {
        ...apiService.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error(
        "Failed to add action:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to add action");
    }

    return await response.json();
  } catch (error) {
    console.error("Error adding action:", error);
    throw error;
  }
};

export const generateSTR = async (id: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${id}/generate-str`, {
      method: "POST",
      headers: apiService.getAuthHeaders(),
    });

    if (!response.ok) {
      console.error(
        "Failed to generate STR:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to generate STR");
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating STR:", error);
    throw error;
  }
};

export const downloadSTR = async (id: string) => {
  const res = await fetch(`${API_BASE_URL}/cases/${id}/str-report`, {
    method: "GET",
    headers: apiService.getAuthHeaders(),
  });
  return res.blob();
};

// KYC Identity Linkage API functions
export const linkKYCIdentity = async (data: {
  wallet: string;
  pan?: string;
  aadhaar?: string;
  name?: string;
  dob?: string;
  address?: string;
  manual?: boolean;
  linked_by?: string;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/kyc/link-identity`, {
      method: "POST",
      headers: {
        ...apiService.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error(
        "Failed to link KYC identity:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to link KYC identity");
    }

    return await response.json();
  } catch (error) {
    console.error("Error linking KYC identity:", error);
    throw error;
  }
};

export const getWalletKYCIdentities = async (wallet: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/kyc/wallet/${wallet}`, {
      headers: apiService.getAuthHeaders(),
    });

    if (!response.ok) {
      console.error(
        "Failed to fetch wallet KYC identities:",
        response.status,
        response.statusText,
      );
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching wallet KYC identities:", error);
    return [];
  }
};

export const getKYCIdentity = async (id: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/kyc/identity/${id}`, {
      headers: apiService.getAuthHeaders(),
    });

    if (!response.ok) {
      console.error(
        "Failed to fetch KYC identity:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to fetch KYC identity");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching KYC identity:", error);
    throw error;
  }
};

export const removeKYCLink = async (linkId: string) => {
  const response = await fetch(`${API_BASE_URL}/kyc/links/${linkId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
};

export const getCaseNotes = async (caseId: string) => {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/notes`, {
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
};

export const getRegulatoryReports = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      headers: apiService.getAuthHeaders(),
    });

    if (!response.ok) {
      console.error(
        "Failed to fetch reports:",
        response.status,
        response.statusText,
      );
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
};

export const generateRegulatoryReport = async (reportData: {
  type: string;
  regulatorCode: string;
  reportingPeriod: {
    from: string;
    to: string;
  };
  threshold?: number;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: "POST",
      headers: {
        ...apiService.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reportData),
    });

    if (!response.ok) {
      console.error(
        "Failed to generate report:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to generate report");
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
};

export const prepareRegulatoryReport = async (prepareData: {
  reportType: string;
  regulatorCode: string;
  deadlineType: string;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/prepare`, {
      method: "POST",
      headers: {
        ...apiService.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prepareData),
    });

    if (!response.ok) {
      console.error(
        "Failed to prepare report:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to prepare report");
    }

    return await response.json();
  } catch (error) {
    console.error("Error preparing report:", error);
    throw error;
  }
};

export const downloadRegulatoryReport = async (reportId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reports/${reportId}/download`,
      {
        headers: apiService.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      console.error(
        "Failed to download report:",
        response.status,
        response.statusText,
      );
      throw new Error("Failed to download report");
    }

    return await response.blob();
  } catch (error) {
    console.error("Error downloading report:", error);
    throw error;
  }
};

export const searchWallet = async (address: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallets/${address}`, {
      headers: apiService.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    // Transform the backend response to match frontend expectations
    return {
      address: data.address,
      chain: data.chain,
      balance: parseFloat(data.balance) || 0, // Convert string to number
      riskScore: data.riskScore || 0,
      lastActivity: data.lastActivity,
      labels: data.labels || [],
      isBlacklisted: data.isBlacklisted || false,
      entityType: data.entityType || 'individual',
    };
  } catch (error) {
    console.error('Error searching wallet:', error);
    throw error;
  }
};

export const getWalletTransactions = async (address: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/wallets/${address}/transactions`,
      {
        headers: apiService.getAuthHeaders(),
      },
    );
    
    const data = await response.json();
    
    // Transform the backend response to match frontend expectations
    if (data.success && data.data) {
      // Combine regular transactions and token transfers
      const allTransactions = [];
      
      // Add regular transactions
      if (data.data.transactions) {
        allTransactions.push(...data.data.transactions.map((tx: any) => ({
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
        })));
      }
      
      // Add token transfers
      if (data.data.tokenTransfers) {
        allTransactions.push(...data.data.tokenTransfers.map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          amount: parseFloat(tx.valueFormatted) || 0,
          currency: tx.tokenSymbol || 'TOKEN',
          timestamp: new Date(tx.timestamp * 1000).toISOString(),
          chain: tx.chain || 'ethereum',
          blockNumber: tx.blockNumber,
          gasUsed: 0,
          riskFlags: [],
          category: 'normal' as any,
          isTokenTransfer: true,
          tokenName: tx.tokenName,
          contractAddress: tx.contractAddress,
        })));
      }
      
      // Sort by timestamp (newest first)
      allTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return allTransactions;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return [];
  }
};

export const performSanctionScreening = async (address: string) => {
  const response = await fetch(`${API_BASE_URL}/sanctions/screen/${address}`, {
    headers: apiService.getAuthHeaders(),
  });
  return response.json();
};
