import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getEnvironmentInfo } from "@/lib/apiConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get environment info
  const envInfo = getEnvironmentInfo();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Redirect to dashboard on successful login
        navigate("/", { replace: true });
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const prefillDemoCredentials = (role: "admin" | "analyst" | "partner") => {
    const credentials = {
      admin: { email: "admin@cryptocompliance.com", password: "Admin123!" },
      analyst: {
        email: "analyst@cryptocompliance.com",
        password: "Analyst123!",
      },
      partner: { email: "partner@exchange.com", password: "Partner123!" },
    };

    setFormData(credentials[role]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 text-white rounded-lg">
              <Shield className="h-8 w-8" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            CryptoCompliance Pro
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Advanced Blockchain Risk & Compliance Platform
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Access the compliance dashboard with your credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Demo Credentials</CardTitle>
            <CardDescription>
              Quick login for demonstration (development only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => prefillDemoCredentials("admin")}
                className="justify-start"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Access
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => prefillDemoCredentials("analyst")}
                className="justify-start"
              >
                <Shield className="h-4 w-4 mr-2" />
                Analyst Access
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => prefillDemoCredentials("partner")}
                className="justify-start"
              >
                <Shield className="h-4 w-4 mr-2" />
                Partner Access
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backend Status & Environment Info */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          {envInfo.shouldUseMock ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 font-medium">🌐 Demo Mode</p>
                <p className="text-blue-600">
                  Running in cloud environment with demo data
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  No backend server required - all authentication is simulated
                </p>
              </div>
            </>
          ) : (
            <>
              <p>
                Backend:{" "}
                <span className="text-blue-600">{envInfo.apiBaseUrl}</span>
              </p>
              <p>Local development mode</p>
            </>
          )}
          <p className="text-xs">
            Environment: {envInfo.isCloud ? "Cloud" : "Local"} | Host:{" "}
            {envInfo.hostname}
          </p>
        </div>
      </div>
    </div>
  );
}
