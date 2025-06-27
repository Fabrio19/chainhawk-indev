// Mock API Service for cloud/demo environment
// Provides demo data and simulated API responses

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "analyst" | "partner";
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Mock users database
const mockUsers: Record<string, { user: User; password: string }> = {
  "admin@cryptocompliance.com": {
    user: {
      id: "admin-001",
      name: "System Administrator",
      email: "admin@cryptocompliance.com",
      role: "admin",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    password: "Admin123!",
  },
  "analyst@cryptocompliance.com": {
    user: {
      id: "analyst-001",
      name: "Senior Compliance Analyst",
      email: "analyst@cryptocompliance.com",
      role: "analyst",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    password: "Analyst123!",
  },
  "partner@exchange.com": {
    user: {
      id: "partner-001",
      name: "Exchange Partner",
      email: "partner@exchange.com",
      role: "partner",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    password: "Partner123!",
  },
};

// Simulate API delay
const simulateDelay = (ms: number = 500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Generate mock JWT token
const generateMockToken = (userId: string): string => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      userId,
      exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 hours
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  const signature = btoa("mock-signature-for-demo");
  return `${header}.${payload}.${signature}`;
};

// Verify mock token
const verifyMockToken = (token: string): { userId: string } | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { userId: payload.userId };
  } catch {
    return null;
  }
};

// Mock API Service Class
class MockApiService {
  private currentUser: User | null = null;
  private currentToken: string | null = null;

  // Generate mock data
  private generateMockWallet() {
    return {
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      chain: "ETH",
      balance: Math.random() * 100000,
      riskScore: Math.floor(Math.random() * 100),
      lastActivity: new Date().toISOString(),
      labels: ["Exchange", "DeFi"][Math.floor(Math.random() * 2)]
        ? ["Exchange"]
        : [],
      isBlacklisted: Math.random() > 0.9,
      entityType: "individual",
    };
  }

  // Initialize from localStorage
  constructor() {
    const token = localStorage.getItem("auth_token");
    if (token) {
      const tokenData = verifyMockToken(token);
      if (tokenData) {
        // Find user by ID
        const userEntry = Object.values(mockUsers).find(
          (entry) => entry.user.id === tokenData.userId,
        );
        if (userEntry) {
          this.currentUser = userEntry.user;
          this.currentToken = token;
        }
      }
    }
  }

  // Authentication API
  async login(
    email: string,
    password: string,
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    await simulateDelay();

    const userEntry = mockUsers[email];
    if (!userEntry || userEntry.password !== password) {
      return {
        success: false,
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      };
    }

    const token = generateMockToken(userEntry.user.id);
    this.currentUser = userEntry.user;
    this.currentToken = token;

    return {
      success: true,
      data: {
        user: userEntry.user,
        token,
      },
    };
  }

  async getProfile(): Promise<ApiResponse<{ user: User; authMethod: string }>> {
    await simulateDelay();

    if (!this.currentUser || !this.currentToken) {
      return {
        success: false,
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      };
    }

    return {
      success: true,
      data: {
        user: this.currentUser,
        authMethod: "JWT",
      },
    };
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    await simulateDelay();

    // Check if user already exists
    if (mockUsers[userData.email]) {
      return {
        success: false,
        error: "User already exists",
        code: "USER_EXISTS",
      };
    }

    // Create new user
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: (userData.role as any) || "analyst",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockUsers[userData.email] = {
      user: newUser,
      password: userData.password,
    };

    const token = generateMockToken(newUser.id);

    return {
      success: true,
      data: {
        user: newUser,
        token,
      },
    };
  }

  // Mock other API methods
  async getUsers(): Promise<ApiResponse<{ users: User[] }>> {
    await simulateDelay();

    if (!this.currentUser || this.currentUser.role !== "admin") {
      return {
        success: false,
        error: "Access denied",
        code: "ACCESS_DENIED",
      };
    }

    const users = Object.values(mockUsers).map((entry) => entry.user);
    return {
      success: true,
      data: { users, pagination: { total: users.length, page: 1, limit: 10 } },
    };
  }

  async healthCheck(): Promise<ApiResponse<any>> {
    await simulateDelay(100);
    return {
      success: true,
      data: {
        status: "OK",
        service: "Mock CryptoCompliance Backend",
        version: "1.0.0-mock",
        timestamp: new Date().toISOString(),
        environment: "demo",
      },
    };
  }

  // Placeholder methods for other APIs
  async getAuditLogs(): Promise<ApiResponse<any>> {
    await simulateDelay();
    return {
      success: true,
      data: {
        auditLogs: [],
        pagination: { total: 0, page: 1, limit: 10 },
      },
    };
  }

  async generateApiKey(): Promise<ApiResponse<any>> {
    await simulateDelay();
    return {
      success: true,
      data: {
        apiKey: "demo-api-key-" + Math.random().toString(36).substring(7),
        name: "Demo API Key",
        keyPreview: "demo-****-****",
      },
    };
  }

  // Add other mock methods as needed
  async createUser(userData: any): Promise<ApiResponse<any>> {
    return this.register(userData);
  }

  async updateUser(userId: string, updates: any): Promise<ApiResponse<any>> {
    await simulateDelay();
    return { success: true, data: { user: this.currentUser } };
  }

  async deleteUser(userId: string): Promise<ApiResponse<any>> {
    await simulateDelay();
    return { success: true, data: { message: "User deleted (demo)" } };
  }

  async getUser(userId: string): Promise<ApiResponse<any>> {
    await simulateDelay();
    return { success: true, data: { user: this.currentUser } };
  }

  // Dashboard operation methods
  async screenWallet(address: string): Promise<ApiResponse<any>> {
    await simulateDelay(800);
    const walletData = {
      ...this.generateMockWallet(),
      address,
    };
    return { success: true, data: walletData };
  }

  async screenSanctions(address: string): Promise<ApiResponse<any>> {
    await simulateDelay(1000);
    // 10% chance of finding sanctions
    if (Math.random() > 0.9) {
      return {
        success: true,
        data: [
          {
            sanctionList: "OFAC",
            entityName: "Suspicious Entity",
            riskLevel: "HIGH",
            description: "Listed for money laundering activities",
          },
        ],
      };
    }
    return { success: true, data: [] };
  }

  async traceTransaction(hash: string): Promise<ApiResponse<any>> {
    await simulateDelay(1200);
    return {
      success: true,
      data: {
        traceId: `trace_${Math.random().toString(36).substr(2, 9)}`,
        status: "started",
        estimatedTime: "2-3 minutes",
      },
    };
  }

  async generateReport(type: string): Promise<ApiResponse<any>> {
    await simulateDelay(600);
    return {
      success: true,
      data: {
        id: `${type.toLowerCase()}_${Date.now()}`,
        type,
        status: "generated",
        createdAt: new Date().toISOString(),
        downloadUrl: `/reports/${type.toLowerCase()}_${Date.now()}.pdf`,
      },
    };
  }

  async investigateAlert(alertId: string): Promise<ApiResponse<any>> {
    await simulateDelay(400);
    return {
      success: true,
      data: {
        alertId,
        status: "investigating",
        investigatedAt: new Date().toISOString(),
        assignedTo: this.currentUser?.name || "Current User",
      },
    };
  }

  async changePassword(): Promise<ApiResponse<any>> {
    await simulateDelay();
    return { success: true, data: { message: "Password changed (demo)" } };
  }

  async revokeApiKey(): Promise<ApiResponse<any>> {
    await simulateDelay();
    return { success: true, data: { message: "API key revoked (demo)" } };
  }

  async getAuditLogStats(): Promise<ApiResponse<any>> {
    await simulateDelay();
    return {
      success: true,
      data: {
        totalLogs: 150,
        todayLogs: 12,
        averageResponseTime: 250,
        topActions: ["login", "wallet_screening", "transaction_trace"],
      },
    };
  }

  async getComplianceStatus(): Promise<ApiResponse<any>> {
    await simulateDelay();
    return {
      success: true,
      data: {
        status: "operational",
        lastCheck: new Date().toISOString(),
        services: {
          sanctions: "online",
          pep: "online",
          watchlists: "online",
        },
      },
    };
  }
}

// Export singleton instance
export const mockApiService = new MockApiService();
export default mockApiService;
