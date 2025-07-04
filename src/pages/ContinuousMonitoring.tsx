import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getWatchlist,
  getMonitoringRules,
} from "@/lib/advanced-api";
import type {
  WatchlistEntry,
  MonitoringRule,
} from "@/lib/advanced-types";
import {
  Eye,
  AlertTriangle,
  Plus,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  Edit,
  Trash,
  Bell,
  Shield,
  User,
} from "lucide-react";

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ContinuousMonitoring Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
              <p className="text-gray-600 mb-4">Please refresh the page to try again.</p>
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    return this.props.children;
  }
}

function ContinuousMonitoringContent() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [watchlistData, rulesData] = await Promise.all([
          getWatchlist(),
          getMonitoringRules(),
        ]);
        setWatchlist(watchlistData || []);
        setRules(rulesData || []);
      } catch (error) {
        console.error("Error loading monitoring data:", error);
        setError("Failed to load monitoring data. Please try again.");
        // Set empty arrays as fallback
        setWatchlist([]);
        setRules([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getCategoryBadge = (category: string) => {
    const colors = {
      sanctions: "bg-red-100 text-red-800",
      pep: "bg-orange-100 text-orange-800",
      high_risk: "bg-yellow-100 text-yellow-800",
      investigation: "bg-blue-100 text-blue-800",
      internal: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge
        variant="outline"
        className={colors[category as keyof typeof colors] || ""}
      >
        {category.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="default">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "threshold":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "velocity":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "pattern":
        return <Eye className="h-4 w-4 text-purple-500" />;
      case "entity":
        return <User className="h-4 w-4 text-green-500" />;
      case "geographic":
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  // Safe rendering with error boundary
  try {
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
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Continuous Monitoring
            </h1>
            <p className="text-gray-600 mt-2">
              Automated watchlist monitoring with real-time alerts for risk score
              changes and suspicious activities
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {watchlist.filter((w) => w.isActive).length}
                    </div>
                    <div className="text-sm text-gray-600">Active Watchlist</div>
                  </div>
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {rules.filter((r) => r.isActive).length}
                    </div>
                    <div className="text-sm text-gray-600">Active Rules</div>
                  </div>
                  <Settings className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {watchlist.reduce((sum, w) => sum + w.alertCount, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Alerts</div>
                  </div>
                  <Bell className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {
                        watchlist.filter(
                          (w) =>
                            w.priority === "critical" || w.priority === "high",
                        ).length
                      }
                    </div>
                    <div className="text-sm text-gray-600">High Priority</div>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="watchlist" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
              <TabsTrigger value="rules">Monitoring Rules</TabsTrigger>
              <TabsTrigger value="alerts">Recent Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="watchlist" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Watchlist Entries
                    </span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Watchlist
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Wallet to Watchlist</DialogTitle>
                          <DialogDescription>
                            Add a wallet address for continuous monitoring
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input placeholder="Wallet address" />
                          <Input placeholder="Entity name (optional)" />
                          <Textarea
                            placeholder="Reason for monitoring"
                            rows={3}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sanctions">
                                  Sanctions
                                </SelectItem>
                                <SelectItem value="pep">PEP</SelectItem>
                                <SelectItem value="high_risk">
                                  High Risk
                                </SelectItem>
                                <SelectItem value="investigation">
                                  Investigation
                                </SelectItem>
                                <SelectItem value="internal">Internal</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline">Cancel</Button>
                            <Button>Add to Watchlist</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                  <CardDescription>
                    Wallets under continuous monitoring for compliance risk
                    changes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Wallet / Entity</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Added By</TableHead>
                        <TableHead>Alerts</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {watchlist.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {entry.entityName || "Unknown Entity"}
                              </div>
                              <div className="text-sm text-gray-600 font-mono">
                                {entry.walletAddress.slice(0, 10)}...
                                {entry.walletAddress.slice(-8)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {entry.reason}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getCategoryBadge(entry.category)}
                          </TableCell>
                          <TableCell>
                            {getPriorityBadge(entry.priority)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.addedBy}</div>
                              <div className="text-xs text-gray-600">
                                {new Date(entry.addedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Bell className="h-4 w-4 text-orange-500" />
                              <span className="font-semibold">
                                {entry.alertCount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {entry.isActive ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-gray-500" />
                              )}
                              <span className="text-sm">
                                {entry.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rules" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Monitoring Rules
                    </span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Rule
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create Monitoring Rule</DialogTitle>
                          <DialogDescription>
                            Set up automated monitoring conditions and actions
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <Input placeholder="Rule name" />
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Rule type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="threshold">
                                  Threshold
                                </SelectItem>
                                <SelectItem value="velocity">Velocity</SelectItem>
                                <SelectItem value="pattern">Pattern</SelectItem>
                                <SelectItem value="entity">Entity</SelectItem>
                                <SelectItem value="geographic">
                                  Geographic
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea placeholder="Rule description" rows={2} />

                          <div>
                            <h4 className="font-medium mb-2">Conditions</h4>
                            <div className="grid grid-cols-3 gap-2">
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Metric" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="risk_score">
                                    Risk Score
                                  </SelectItem>
                                  <SelectItem value="transaction_amount">
                                    Transaction Amount
                                  </SelectItem>
                                  <SelectItem value="velocity">
                                    Velocity
                                  </SelectItem>
                                  <SelectItem value="geography">
                                    Geography
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value=">">Greater than</SelectItem>
                                  <SelectItem value="<">Less than</SelectItem>
                                  <SelectItem value="=">Equals</SelectItem>
                                  <SelectItem value="!=">Not equals</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input placeholder="Value" />
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Actions</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Action type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="alert">
                                    Send Alert
                                  </SelectItem>
                                  <SelectItem value="case">
                                    Create Case
                                  </SelectItem>
                                  <SelectItem value="report">
                                    Generate Report
                                  </SelectItem>
                                  <SelectItem value="webhook">
                                    Call Webhook
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Severity" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="critical">
                                    Critical
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              placeholder="Recipients (comma separated)"
                              className="mt-2"
                            />
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button variant="outline">Cancel</Button>
                            <Button>Create Rule</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                  <CardDescription>
                    Automated rules that trigger alerts and actions based on
                    wallet activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getRuleTypeIcon(rule.ruleType)}
                            <div>
                              <h3 className="font-semibold">{rule.name}</h3>
                              <p className="text-sm text-gray-600">
                                {rule.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch checked={rule.isActive} />
                            <Badge variant="outline" className="capitalize">
                              {rule.ruleType}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Created by:</span>
                            <div className="font-medium">{rule.createdBy}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Triggered:</span>
                            <div className="font-medium">
                              {rule.triggerCount} times
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Last triggered:</span>
                            <div className="font-medium">
                              {rule.lastTriggered
                                ? new Date(
                                    rule.lastTriggered,
                                  ).toLocaleDateString()
                                : "Never"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-sm text-gray-600">
                            {rule.conditions.length} condition(s) •{" "}
                            {rule.actions.length} action(s)
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Test
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Recent Alerts
                  </CardTitle>
                  <CardDescription>
                    Alerts generated by monitoring rules in the last 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className="flex items-start space-x-3 p-3 border rounded-lg"
                      >
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              Risk Score Threshold Exceeded
                            </h4>
                            <Badge variant="destructive">High</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Wallet 0x1234...5678 risk score increased to 85,
                            exceeding threshold of 70
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Rule: High Risk Threshold</span>
                            <span>
                              {new Date(
                                Date.now() - i * 2 * 60 * 60 * 1000,
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Investigate
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    );
  } catch (error) {
    console.error("Error rendering ContinuousMonitoring component:", error);
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Rendering Component</h3>
            <p className="text-gray-600 mb-4">{error?.message || "An error occurred"}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
}

// Export with Error Boundary wrapper
export default function ContinuousMonitoring() {
  return (
    <ErrorBoundary>
      <ContinuousMonitoringContent />
    </ErrorBoundary>
  );
}
