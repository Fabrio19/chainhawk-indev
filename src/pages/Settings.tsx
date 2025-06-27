import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  getAPIIntegrations,
  getBlockchainNetworks,
  getAuditLogs,
  type APIIntegration,
  type BlockchainNetwork,
  type AuditLogEntry,
} from "@/lib/api";
import {
  Settings as SettingsIcon,
  Plug,
  Shield,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Key,
  Globe,
  Clock,
  User,
  Save,
  Plus,
} from "lucide-react";

export default function Settings() {
  const [integrations, setIntegrations] = useState<APIIntegration[]>([]);
  const [networks, setNetworks] = useState<BlockchainNetwork[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state management
  const [formData, setFormData] = useState({
    serviceName: "",
    ethereumNode: "",
    bitcoinNode: "",
    polygonNode: "",
    syncInterval: "30",
    strThreshold: "1000000",
    ctrThreshold: "1000000",
    fiuEndpoint: "https://fiuindia.gov.in/api",
    ipWhitelist: "192.168.1.0/24, 10.0.0.0/8",
    apiRateLimit: "1000 requests/hour",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [integrationsData, networksData, auditData] = await Promise.all([
          getAPIIntegrations(),
          getBlockchainNetworks(),
          getAuditLogs(),
        ]);
        setIntegrations(integrationsData);
        setNetworks(networksData);
        setAuditLogs(auditData);
      } catch (error) {
        console.error("Error loading settings data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="secondary">Active</Badge>;
      case "inactive":
        return <Badge variant="outline">Inactive</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "inactive":
        return <Clock className="h-4 w-4 text-gray-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure system settings, API integrations, and compliance
            parameters
          </p>
        </div>

        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="integrations">API Integrations</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plug className="h-5 w-5 mr-2" />
                  API Integrations
                </CardTitle>
                <CardDescription>
                  Manage external API connections for data sources and
                  compliance services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Plug className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {integration.name}
                            </h3>
                            <p className="text-sm text-gray-600 capitalize">
                              {integration.type} integration
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(integration.status)}
                          {getStatusBadge(integration.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Endpoint:</span>
                          <div className="font-mono">
                            {integration.endpoint}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Sync:</span>
                          <div>
                            {new Date(integration.lastSync).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Rate Limit:</span>
                          <div>
                            {integration.rateLimitRemaining.toLocaleString()}{" "}
                            remaining
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="API Key"
                          value={integration.apiKey}
                          type="password"
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm">
                          Test Connection
                        </Button>
                        <Button variant="outline" size="sm">
                          <Key className="h-3 w-3 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="font-semibold mb-4">Add New Integration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Integration Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exchange">Exchange API</SelectItem>
                        <SelectItem value="blockchain">
                          Blockchain Node
                        </SelectItem>
                        <SelectItem value="compliance">
                          Compliance Service
                        </SelectItem>
                        <SelectItem value="bank">Banking API</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Service Name"
                      value={formData.serviceName}
                      onChange={(e) =>
                        handleInputChange("serviceName", e.target.value)
                      }
                    />
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Integration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blockchain" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Blockchain Networks
                </CardTitle>
                <CardDescription>
                  Configure supported blockchain networks and node connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Network</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Block</TableHead>
                      <TableHead>Block Time</TableHead>
                      <TableHead>Transaction Fee</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {networks.map((network) => (
                      <TableRow key={network.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold">
                                {network.symbol}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold">
                                {network.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {network.symbol}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch checked={network.isEnabled} />
                            <span className="text-sm">
                              {network.isEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {network.lastBlock.toLocaleString()}
                        </TableCell>
                        <TableCell>{network.avgBlockTime}s</TableCell>
                        <TableCell>
                          {network.transactionFee} {network.symbol}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Node Configuration</CardTitle>
                <CardDescription>
                  Configure blockchain node endpoints and connection settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ethereum-node">Ethereum Node URL</Label>
                    <Input
                      id="ethereum-node"
                      placeholder="https://mainnet.infura.io/v3/..."
                      value={formData.ethereumNode}
                      onChange={(e) =>
                        handleInputChange("ethereumNode", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="bitcoin-node">Bitcoin Node URL</Label>
                    <Input
                      id="bitcoin-node"
                      placeholder="https://bitcoin-node.example.com"
                      value={formData.bitcoinNode}
                      onChange={(e) =>
                        handleInputChange("bitcoinNode", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="polygon-node">Polygon Node URL</Label>
                    <Input
                      id="polygon-node"
                      placeholder="https://polygon-rpc.com"
                      value={formData.polygonNode}
                      onChange={(e) =>
                        handleInputChange("polygonNode", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="sync-interval">
                      Sync Interval (seconds)
                    </Label>
                    <Input
                      id="sync-interval"
                      placeholder="30"
                      type="number"
                      value={formData.syncInterval}
                      onChange={(e) =>
                        handleInputChange("syncInterval", e.target.value)
                      }
                    />
                  </div>
                </div>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Compliance Configuration
                </CardTitle>
                <CardDescription>
                  Configure compliance rules, thresholds, and regulatory
                  requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Transaction Thresholds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="str-threshold">STR Threshold (INR)</Label>
                      <Input
                        id="str-threshold"
                        placeholder="1000000"
                        type="number"
                        value={formData.strThreshold}
                        onChange={(e) =>
                          handleInputChange("strThreshold", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="ctr-threshold">CTR Threshold (INR)</Label>
                      <Input
                        id="ctr-threshold"
                        placeholder="1000000"
                        type="number"
                        value={formData.ctrThreshold}
                        onChange={(e) =>
                          handleInputChange("ctrThreshold", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Risk Scoring</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>High-Risk Geographic Regions</Label>
                        <p className="text-sm text-gray-600">
                          Apply higher risk scores to transactions from these
                          regions
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Velocity-Based Risk Assessment</Label>
                        <p className="text-sm text-gray-600">
                          Flag high-frequency transaction patterns
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Entity Clustering Analysis</Label>
                        <p className="text-sm text-gray-600">
                          Group related wallets for enhanced risk assessment
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Regulatory Reporting</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fiu-endpoint">FIU-IND Endpoint</Label>
                      <Input
                        id="fiu-endpoint"
                        placeholder="https://fiuindia.gov.in/api"
                        value={formData.fiuEndpoint}
                        onChange={(e) =>
                          handleInputChange("fiuEndpoint", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="reporting-frequency">
                        Reporting Frequency
                      </Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Compliance Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Configure security policies and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Authentication</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-600">
                          Require 2FA for all user accounts
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Single Sign-On (SSO)</Label>
                        <p className="text-sm text-gray-600">
                          Enable SSO integration with corporate directory
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Session Timeout</Label>
                        <p className="text-sm text-gray-600">
                          Auto-logout after inactivity period
                        </p>
                      </div>
                      <Select>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="30 min" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Data Protection</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Database Encryption</Label>
                        <p className="text-sm text-gray-600">
                          Encrypt sensitive data at rest
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>API Data Encryption</Label>
                        <p className="text-sm text-gray-600">
                          Encrypt data in transit using TLS 1.3
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Audit Trail Immutability</Label>
                        <p className="text-sm text-gray-600">
                          Use blockchain for tamper-proof audit logs
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Access Control</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>IP Whitelist</Label>
                      <Input
                        placeholder="192.168.1.0/24, 10.0.0.0/8"
                        value={formData.ipWhitelist}
                        onChange={(e) =>
                          handleInputChange("ipWhitelist", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>API Rate Limiting</Label>
                      <Input placeholder="1000 requests/hour" />
                    </div>
                  </div>
                </div>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Audit Logs
                </CardTitle>
                <CardDescription>
                  Tamper-proof audit trail of all system activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.slice(0, 10).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{log.userId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {log.resourceType}
                            </div>
                            <div className="text-xs text-gray-600 font-mono">
                              {log.resourceId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.ipAddress}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {log.result === "success" ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm capitalize">
                              {log.result}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    Showing 10 of {auditLogs.length} log entries
                  </p>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm">
                      Export Logs
                    </Button>
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit Configuration</CardTitle>
                <CardDescription>
                  Configure audit logging policies and retention settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Log Retention Period</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="7 years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 year</SelectItem>
                        <SelectItem value="3">3 years</SelectItem>
                        <SelectItem value="5">5 years</SelectItem>
                        <SelectItem value="7">7 years</SelectItem>
                        <SelectItem value="10">10 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Backup Frequency</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Daily" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Real-time Log Monitoring</Label>
                      <p className="text-sm text-gray-600">
                        Monitor logs for suspicious activities in real-time
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Blockchain Anchoring</Label>
                      <p className="text-sm text-gray-600">
                        Anchor audit logs to blockchain for immutability
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Audit Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
