import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getApiBaseUrl, shouldUseMockApi } from "@/lib/apiConfig";
import { mockApiService } from "@/services/mockApiService";

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "analyst" | "partner";
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Backend API base URL - environment aware
  const API_BASE_URL = getApiBaseUrl();
  const useMockApi = shouldUseMockApi();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");

      if (storedToken) {
        setToken(storedToken);
        try {
          let response;

          if (useMockApi) {
            // Use mock API service
            response = await mockApiService.getProfile();
            if (response.success) {
              setUser(response.data.user);
            } else {
              localStorage.removeItem("auth_token");
              setToken(null);
            }
          } else {
            // Use real backend API
            const fetchResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
              headers: {
                Authorization: `Bearer ${storedToken}`,
                "Content-Type": "application/json",
              },
            });

            if (fetchResponse.ok) {
              const data = await fetchResponse.json();
              setUser(data.user);
            } else {
              localStorage.removeItem("auth_token");
              setToken(null);
            }
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          localStorage.removeItem("auth_token");
          setToken(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [API_BASE_URL, useMockApi]);

  // Login function
  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      let result;

      if (useMockApi) {
        // Use mock API service
        result = await mockApiService.login(email, password);

        if (result.success) {
          setUser(result.data.user);
          setToken(result.data.token);
          localStorage.setItem("auth_token", result.data.token);
          return { success: true };
        } else {
          return {
            success: false,
            error: result.error || "Login failed",
          };
        }
      } else {
        // Use real backend API
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem("auth_token", data.token);
          return { success: true };
        } else {
          return {
            success: false,
            error: data.error || "Login failed",
          };
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = useMockApi
        ? "Demo authentication error. Please try again."
        : "Network error. Please check if the backend is running.";

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
  };

  // Calculate derived state
  const isAuthenticated = !!user && !!token;

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
