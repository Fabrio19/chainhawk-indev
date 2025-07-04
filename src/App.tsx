import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import WalletScreening from "./pages/WalletScreening";
import TransactionTracing from "./pages/TransactionTracing";
import GraphVisualization from "./pages/GraphVisualization";
import ComplianceScreening from "./pages/ComplianceScreening";
import RiskHistory from "./pages/RiskHistory";
import ContinuousMonitoring from "./pages/ContinuousMonitoring";
import CaseManagement from "./pages/CaseManagement";
import EnhancedCaseManagement from "./pages/EnhancedCaseManagement";
import EntityRiskProfiles from "./pages/EntityRiskProfiles";
import AdvancedRiskAnalysis from "./pages/AdvancedRiskAnalysis";
import TravelRule from "./pages/TravelRule";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import BridgeMonitoring from "./pages/BridgeMonitoring";
import TestPage from "./pages/TestPage";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (for login when already authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// App Routes Component
const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet-screening"
        element={
          <ProtectedRoute>
            <WalletScreening />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction-tracing"
        element={
          <ProtectedRoute>
            <TransactionTracing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/graph-visualization"
        element={
          <ProtectedRoute>
            <GraphVisualization />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance-screening"
        element={
          <ProtectedRoute>
            <ComplianceScreening />
          </ProtectedRoute>
        }
      />
      <Route
        path="/risk-history"
        element={
          <ProtectedRoute>
            <RiskHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/continuous-monitoring"
        element={
          <ProtectedRoute>
            <ContinuousMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/case-management"
        element={
          <ProtectedRoute>
            <CaseManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enhanced-case-management"
        element={
          <ProtectedRoute>
            <EnhancedCaseManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/entity-risk-profiles"
        element={
          <ProtectedRoute>
            <EntityRiskProfiles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/advanced-risk-analysis"
        element={
          <ProtectedRoute>
            <AdvancedRiskAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/travel-rule"
        element={
          <ProtectedRoute>
            <TravelRule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-management"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bridge-monitoring"
        element={
          <ProtectedRoute>
            <BridgeMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test"
        element={
          <ProtectedRoute>
            <TestPage />
          </ProtectedRoute>
        }
      />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
