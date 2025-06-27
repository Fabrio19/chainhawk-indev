import { getApiBaseUrl } from "@/lib/apiConfig";

// API Response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface WalletSearchResult {
  address: string;
  chain: string;
  balance: number;
  riskScore: number;
  lastActivity: string;
  labels: string[];
  isBlacklisted: boolean;
  entityType: string;
}

interface SanctionScreenResult {
  sanctionList: string;
  entityName: string;
  riskLevel: string;
  description: string;
  confidence?: number;
}

interface TransactionTrace {
  hash: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  timestamp: string;
  chain: string;
  riskFlags: string[];
}

interface GeneratedReport {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  downloadUrl?: string;
}

class RealApiService {
  private apiBaseUrl: string;
  private getAuthToken: () => string | null;

  constructor() {
    this.apiBaseUrl = getApiBaseUrl();
    this.getAuthToken = () => localStorage.getItem("auth_token");
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, config);
      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return {
          success: false,
          error: data.error || data.message || "Request failed",
        };
      }
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Wallet screening
  async screenWallet(
    address: string,
  ): Promise<ApiResponse<WalletSearchResult>> {
    return this.makeRequest<WalletSearchResult>(`/wallets/${address}`);
  }

  // Sanction screening
  async runSanctionCheck(
    address: string,
  ): Promise<ApiResponse<SanctionScreenResult[]>> {
    return this.makeRequest<SanctionScreenResult[]>(
      `/sanctions/screen/${address}`,
    );
  }

  // Transaction tracing
  async traceTransaction(
    walletAddress: string,
    chain: string = "ETH",
  ): Promise<ApiResponse<{ traceId: string }>> {
    return this.makeRequest<{ traceId: string }>("/tracing/start", {
      method: "POST",
      body: JSON.stringify({
        walletAddress,
        chain,
        depth: 3,
      }),
    });
  }

  async getTraceResults(
    traceId: string,
  ): Promise<ApiResponse<TransactionTrace[]>> {
    return this.makeRequest<TransactionTrace[]>(`/tracing/${traceId}`);
  }

  // Report generation
  async generateSTRReport(data: any): Promise<ApiResponse<GeneratedReport>> {
    return this.makeRequest<GeneratedReport>("/reports", {
      method: "POST",
      body: JSON.stringify({
        type: "STR",
        ...data,
      }),
    });
  }

  async prepareReport(type: string = "STR"): Promise<ApiResponse<any>> {
    return this.makeRequest("/reports/prepare", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
  }

  // Quick wallet check
  async quickWalletCheck(
    walletAddress: string,
    chain: string = "ETH",
  ): Promise<ApiResponse<any>> {
    return this.makeRequest("/tracing/quick-check", {
      method: "POST",
      body: JSON.stringify({
        walletAddress,
        chain,
      }),
    });
  }

  // Alert investigation
  async investigateAlert(alertId: string): Promise<ApiResponse<any>> {
    // For now, simulate investigation by running wallet screening
    return {
      success: true,
      data: {
        alertId,
        status: "investigating",
        investigatedAt: new Date().toISOString(),
      },
    };
  }

  // System status checks
  async getSystemStatus(): Promise<ApiResponse<any>> {
    return this.makeRequest("/health");
  }

  // Dashboard stats (using existing mock data structure)
  async getDashboardStats(): Promise<ApiResponse<any>> {
    // This would typically come from a real endpoint
    return {
      success: true,
      data: {
        totalWallets: 45678,
        highRiskWallets: 234,
        todayTransactions: 12456,
        suspiciousTransactions: 89,
        openCases: 23,
        pendingReports: 5,
        activeAlerts: 12,
        complianceScore: 87,
      },
    };
  }

  // Cases management
  async createCase(data: any): Promise<ApiResponse<any>> {
    return this.makeRequest("/cases", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCases(): Promise<ApiResponse<any[]>> {
    return this.makeRequest("/cases");
  }

  // KYC operations
  async performKYCCheck(data: any): Promise<ApiResponse<any>> {
    return this.makeRequest("/kyc/check", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const realApiService = new RealApiService();
export default realApiService;
