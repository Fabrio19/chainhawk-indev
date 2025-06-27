// API Service for backend communication
import { getApiBaseUrl, shouldUseMockApi } from "@/lib/apiConfig";
import { mockApiService } from "./mockApiService";

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

  private shouldUseMock(): boolean {
    return shouldUseMockApi();
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
    if (this.shouldUseMock()) {
      return mockApiService.login(email, password);
    }

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
    if (this.shouldUseMock()) {
      return mockApiService.getProfile();
    }

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
    if (this.shouldUseMock()) {
      return mockApiService.healthCheck();
    }

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
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

export const getCases = async () => {
  // Check if we should use mock API
  if (shouldUseMockApi()) {
    try {
      const response = await mockApiService.getCases();
      return response.success ? response.data : [];
    } catch (error) {
      console.error("Mock API error:", error);
      return [];
    }
  }

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
      const mockResponse = await mockApiService.getCases();
      return mockResponse.success ? mockResponse.data : [];
    }

    if (!response.ok) {
      console.error(
        "Failed to fetch cases:",
        response.status,
        response.statusText,
      );
      // Fallback to mock data on error
      const mockResponse = await mockApiService.getCases();
      return mockResponse.success ? mockResponse.data : [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error("Error fetching cases:", error);
    // Fallback to mock data on network error
    try {
      const mockResponse = await mockApiService.getCases();
      return mockResponse.success ? mockResponse.data : [];
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
    throw error;
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
  const response = await fetch(`${API_BASE_URL}/wallets/${address}`, {
    headers: apiService.getAuthHeaders(),
  });
  return response.json();
};

export const getWalletTransactions = async (address: string) => {
  const response = await fetch(
    `${API_BASE_URL}/wallets/${address}/transactions`,
    {
      headers: apiService.getAuthHeaders(),
    },
  );
  return response.json();
};

export const performSanctionScreening = async (address: string) => {
  const response = await fetch(`${API_BASE_URL}/sanctions/screen/${address}`, {
    headers: apiService.getAuthHeaders(),
  });
  return response.json();
};
