import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/toaster";
import {
  getDashboardStats,
  getActiveAlerts,
} from "@/lib/api";
import type { DashboardStats, Alert as AlertType } from "@/lib/types";
import { useDashboardOperations } from "@/hooks/useDashboardOperations";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  FileText,
  Users,
  Activity,
  CheckCircle,
  Loader2,
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard operations hook
  const {
    screenNewWallet,
    generateSTRReport,
    runSanctionCheck,
    traceTransaction,
    investigateAlert,
    isLoading: operationLoading,
  } = useDashboardOperations();

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [statsData, alertsData] = await Promise.all([
          getDashboardStats(),
          getActiveAlerts(),
        ]);
        setStats(statsData);
        setAlerts(alertsData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setError("Failed to load dashboard data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time monitoring of blockchain compliance and risk metrics
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Wallets
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalWallets?.toLocaleString() || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +2.3% from last month
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                High Risk Wallets
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.highRiskWallets || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12 this week
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Transactions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.todayTransactions?.toLocaleString() || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-orange-600 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {stats?.suspiciousTransactions || 0} suspicious
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Compliance Score
              </CardTitle>
              <Shield className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.complianceScore || "N/A"}%
              </div>
              <Progress value={stats?.complianceScore || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  Active Alerts ({alerts.length})
                </CardTitle>
                <CardDescription>
                  Recent system-generated alerts requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <Alert key={alert.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge
                              variant={getSeverityColor(alert.severity) as any}
                            >
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{alert.type}</Badge>
                          </div>
                          <h4 className="font-semibold text-sm">
                            {alert.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {alert.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Address: {alert.relatedAddress.slice(0, 10)}...
                            {alert.relatedAddress.slice(-8)} •
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => investigateAlert(alert.id)}
                          disabled={operationLoading[`investigate_${alert.id}`]}
                        >
                          {operationLoading[`investigate_${alert.id}`] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Investigate"
                          )}
                        </Button>
                      </div>
                    </Alert>
                  ))}
                </div>
                {alerts.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline">View All Alerts</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Status */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start"
                  onClick={() => screenNewWallet()}
                  disabled={operationLoading.screenWallet}
                >
                  {operationLoading.screenWallet ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Screen New Wallet
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={true}
                  title="STR Report generation not implemented in backend"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate STR Report
                  <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={true}
                  title="Sanction check not implemented in backend"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Run Sanction Check
                  <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={true}
                  title="Transaction tracing not implemented in backend"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Trace Transaction
                  <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Blockchain Sync</span>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Integrations</span>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-600">3/3 Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Processing</span>
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm text-blue-600">Processing</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Compliance DB</span>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-600">Updated</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Open Cases</span>
                    <span className="font-semibold">{stats?.openCases || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Reports</span>
                    <span className="font-semibold">
                      {stats?.pendingReports || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Investigations</span>
                    <span className="font-semibold">N/A</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Month STRs</span>
                    <span className="font-semibold">N/A</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Toaster />
    </DashboardLayout>
  );
}
