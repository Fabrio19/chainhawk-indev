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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getTravelRuleMessages,
  getTravelRuleCompliance,
  type TravelRuleMessage,
  type TravelRuleCompliance,
} from "@/lib/advanced-api";
import {
  Shield,
  Globe,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  Building,
  User,
  ExternalLink,
} from "lucide-react";

export default function TravelRule() {
  const [messages, setMessages] = useState<TravelRuleMessage[]>([]);
  const [compliance, setCompliance] = useState<TravelRuleCompliance | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [messagesData, complianceData] = await Promise.all([
          getTravelRuleMessages(),
          getTravelRuleCompliance(),
        ]);
        setMessages(messagesData);
        setCompliance(complianceData);
      } catch (error) {
        console.error("Error loading travel rule data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="default">Pending</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "expired":
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "expired":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMessageTypeBadge = (type: string) => {
    const colors = {
      inquiry: "bg-blue-100 text-blue-800",
      response: "bg-green-100 text-green-800",
      callback: "bg-orange-100 text-orange-800",
    };
    return (
      <Badge
        variant="outline"
        className={colors[type as keyof typeof colors] || ""}
      >
        {type.toUpperCase()}
      </Badge>
    );
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
          <h1 className="text-3xl font-bold text-gray-900">
            Travel Rule Compliance
          </h1>
          <p className="text-gray-600 mt-2">
            FATF Travel Rule compliance for VASP-to-VASP information exchange
            above threshold amounts
          </p>
        </div>

        {/* Compliance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {compliance?.complianceRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Compliance Rate</div>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
              <Progress value={compliance?.complianceRate} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {compliance?.supportedJurisdictions.length}
                  </div>
                  <div className="text-sm text-gray-600">Jurisdictions</div>
                </div>
                <Globe className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    ${compliance?.thresholdAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Threshold</div>
                </div>
                <MessageSquare className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {compliance?.averageResponseTime.toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Avg Response</div>
                </div>
                <Clock className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="vasps">VASP Registry</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Travel Rule Messages
                  </span>
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    New Inquiry
                  </Button>
                </CardTitle>
                <CardDescription>
                  VASP-to-VASP information exchange messages for transactions
                  above ${compliance?.thresholdAmount.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Message ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Originator VASP</TableHead>
                      <TableHead>Beneficiary VASP</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell className="font-mono text-sm">
                          {message.id}
                        </TableCell>
                        <TableCell>
                          {getMessageTypeBadge(message.messageType)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {message.originatorVASP.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {message.originatorVASP.jurisdiction}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {message.beneficiaryVASP.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {message.beneficiaryVASP.jurisdiction}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-semibold">
                              {message.amount.toLocaleString()}{" "}
                              {message.currency}
                            </div>
                            <div className="text-xs text-gray-600">
                              Threshold: ${message.threshold.toLocaleString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(message.status)}
                            {getStatusBadge(message.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(message.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Travel Rule Message Details
                                </DialogTitle>
                                <DialogDescription>
                                  {message.id} • {message.messageType} •{" "}
                                  {new Date(message.timestamp).toLocaleString()}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                  <div>
                                    <h3 className="font-semibold mb-3 flex items-center">
                                      <Building className="h-4 w-4 mr-2" />
                                      Originator VASP
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <strong>Name:</strong>{" "}
                                        {message.originatorVASP.name}
                                      </div>
                                      <div>
                                        <strong>Jurisdiction:</strong>{" "}
                                        {message.originatorVASP.jurisdiction}
                                      </div>
                                      <div>
                                        <strong>License:</strong>{" "}
                                        {message.originatorVASP.license}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <strong>Verified:</strong>
                                        {message.originatorVASP.isVerified ? (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <AlertTriangle className="h-4 w-4 text-red-500" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="font-semibold mb-3 flex items-center">
                                      <Building className="h-4 w-4 mr-2" />
                                      Beneficiary VASP
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <strong>Name:</strong>{" "}
                                        {message.beneficiaryVASP.name}
                                      </div>
                                      <div>
                                        <strong>Jurisdiction:</strong>{" "}
                                        {message.beneficiaryVASP.jurisdiction}
                                      </div>
                                      <div>
                                        <strong>License:</strong>{" "}
                                        {message.beneficiaryVASP.license}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <strong>Verified:</strong>
                                        {message.beneficiaryVASP.isVerified ? (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <AlertTriangle className="h-4 w-4 text-red-500" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                  <div>
                                    <h3 className="font-semibold mb-3 flex items-center">
                                      <User className="h-4 w-4 mr-2" />
                                      Originator Information
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <strong>Name:</strong>{" "}
                                        {message.originatorInfo.name ||
                                          "Not provided"}
                                      </div>
                                      <div>
                                        <strong>Wallet:</strong>{" "}
                                        <code className="bg-gray-100 px-1 rounded">
                                          {message.originatorInfo.walletAddress.slice(
                                            0,
                                            10,
                                          )}
                                          ...
                                        </code>
                                      </div>
                                      <div>
                                        <strong>Account Ref:</strong>{" "}
                                        {message.originatorInfo
                                          .accountReference || "Not provided"}
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="font-semibold mb-3 flex items-center">
                                      <User className="h-4 w-4 mr-2" />
                                      Beneficiary Information
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <strong>Name:</strong>{" "}
                                        {message.beneficiaryInfo.name ||
                                          "Not provided"}
                                      </div>
                                      <div>
                                        <strong>Wallet:</strong>{" "}
                                        <code className="bg-gray-100 px-1 rounded">
                                          {message.beneficiaryInfo.walletAddress.slice(
                                            0,
                                            10,
                                          )}
                                          ...
                                        </code>
                                      </div>
                                      <div>
                                        <strong>Account Ref:</strong>{" "}
                                        {message.beneficiaryInfo
                                          .accountReference || "Not provided"}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h3 className="font-semibold mb-3">
                                    Transaction Details
                                  </h3>
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <strong>Hash:</strong>
                                      <div className="font-mono bg-gray-100 p-2 rounded mt-1 break-all">
                                        {message.transactionHash}
                                      </div>
                                    </div>
                                    <div>
                                      <strong>Amount:</strong>
                                      <div className="font-semibold text-lg">
                                        {message.amount.toLocaleString()}{" "}
                                        {message.currency}
                                      </div>
                                    </div>
                                    <div>
                                      <strong>Encryption:</strong>
                                      <div>{message.encryptionMethod}</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View on Blockchain
                                  </Button>
                                  {message.status === "pending" && (
                                    <Button>Send Response</Button>
                                  )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vasps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registered VASPs</CardTitle>
                <CardDescription>
                  Virtual Asset Service Providers registered for Travel Rule
                  compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>VASP Name</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>License</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compliance?.vaspRegistry.map((vasp) => (
                      <TableRow key={vasp.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{vasp.name}</div>
                            <div className="text-sm text-gray-600">
                              {vasp.id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vasp.jurisdiction}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {vasp.license}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {vasp.isVerified ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            <span>
                              {vasp.isVerified ? "Verified" : "Pending"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {vasp.endpoint}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Test Connection
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Travel Rule Configuration</CardTitle>
                <CardDescription>
                  Configure Travel Rule compliance settings and thresholds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Threshold Amount (USD)
                    </label>
                    <Input
                      type="number"
                      defaultValue={compliance?.thresholdAmount}
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Response Timeout (hours)
                    </label>
                    <Input type="number" defaultValue={48} placeholder="48" />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">
                    Supported Jurisdictions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {compliance?.supportedJurisdictions.map((jurisdiction) => (
                      <Badge key={jurisdiction} variant="secondary">
                        {jurisdiction}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Encryption Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>AES-256 Encryption</span>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Digital Signatures</span>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>TLS 1.3</span>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                  </div>
                </div>

                <Button>Save Configuration</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Messages Sent</span>
                      <span className="font-semibold">156</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Messages Received</span>
                      <span className="font-semibold">143</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Successful Exchanges</span>
                      <span className="font-semibold text-green-600">
                        94.5%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Average Response Time</span>
                      <span className="font-semibold">24.3 hours</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Jurisdiction Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["US", "EU", "SG", "JP", "IN"].map((jurisdiction) => (
                      <div key={jurisdiction} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{jurisdiction}</span>
                          <span>{Math.floor(Math.random() * 50) + 10}%</span>
                        </div>
                        <Progress
                          value={Math.floor(Math.random() * 50) + 10}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
