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
import {
  getDarknetDetections,
  getFiatRampRisk,
  type DarknetDetection,
  type FiatRampRisk,
} from "@/lib/advanced-api";
import {
  Shield,
  AlertTriangle,
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  TrendingUp,
  Building,
  CreditCard,
  Zap,
  Globe,
} from "lucide-react";

export default function AdvancedRiskAnalysis() {
  const [darknetDetections, setDarknetDetections] = useState<
    DarknetDetection[]
  >([]);
  const [fiatRampRisk, setFiatRampRisk] = useState<FiatRampRisk | null>(null);
  const [searchAddress, setSearchAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const darknetData = await getDarknetDetections();
        setDarknetDetections(darknetData);
      } catch (error) {
        console.error("Error loading darknet data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleFiatRampSearch = async () => {
    if (!searchAddress.trim()) return;

    setSearchLoading(true);
    try {
      const fiatData = await getFiatRampRisk(searchAddress);
      setFiatRampRisk(fiatData);
    } catch (error) {
      console.error("Error loading fiat ramp data:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const getDetectionTypeBadge = (type: string) => {
    const colors = {
      mixer: "bg-red-100 text-red-800",
      bridge: "bg-orange-100 text-orange-800",
      darknet_market: "bg-purple-100 text-purple-800",
      privacy_coin: "bg-yellow-100 text-yellow-800",
      tumbler: "bg-red-100 text-red-800",
    };
    return (
      <Badge
        variant="outline"
        className={colors[type as keyof typeof colors] || ""}
      >
        {type.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getRiskLevelBadge = (level: string) => {
    switch (level) {
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

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      bank_transfer: "bg-blue-100 text-blue-800",
      upi: "bg-green-100 text-green-800",
      imps: "bg-purple-100 text-purple-800",
      neft: "bg-orange-100 text-orange-800",
      rtgs: "bg-red-100 text-red-800",
    };
    return (
      <Badge
        variant="outline"
        className={colors[method as keyof typeof colors] || ""}
      >
        {method.replace("_", " ").toUpperCase()}
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
            Advanced Risk Analysis
          </h1>
          <p className="text-gray-600 mt-2">
            Darknet detection, mixing service identification, bridge analysis,
            and fiat on/off-ramp risk assessment for Indian compliance
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {darknetDetections.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Darknet Detections
                  </div>
                </div>
                <Shield className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {
                      darknetDetections.filter(
                        (d) => d.detectionType === "mixer",
                      ).length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Mixer Services</div>
                </div>
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {
                      darknetDetections.filter(
                        (d) => d.detectionType === "bridge",
                      ).length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Bridge Services</div>
                </div>
                <Globe className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {
                      darknetDetections.filter(
                        (d) => d.riskLevel === "critical",
                      ).length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Critical Risk</div>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="darknet" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="darknet">Darknet Detection</TabsTrigger>
            <TabsTrigger value="fiat-ramp">Fiat Ramp Risk</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="darknet" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-red-500" />
                  Darknet & Mixing Service Detections
                </CardTitle>
                <CardDescription>
                  Wallets connected to mixers, bridges, darknet markets, and
                  privacy services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Detection Type</TableHead>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>First/Last Detected</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {darknetDetections.map((detection, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {detection.walletAddress.slice(0, 10)}...
                          {detection.walletAddress.slice(-8)}
                        </TableCell>
                        <TableCell>
                          {getDetectionTypeBadge(detection.detectionType)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {detection.serviceName}
                            </div>
                            {detection.associatedServices.length > 0 && (
                              <div className="text-xs text-gray-600">
                                +{detection.associatedServices.length} more
                                services
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRiskLevelBadge(detection.riskLevel)}
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-semibold">
                              {detection.confidence.toFixed(0)}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  detection.confidence > 90
                                    ? "bg-green-500"
                                    : detection.confidence > 70
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${detection.confidence}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>
                              First:{" "}
                              {new Date(
                                detection.firstDetected,
                              ).toLocaleDateString()}
                            </div>
                            <div>
                              Last:{" "}
                              {new Date(
                                detection.lastDetected,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                            <Button variant="outline" size="sm">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Report
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Detection Evidence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detection Evidence Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Transaction Pattern Matches</span>
                      <span className="font-semibold">156</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Known Service Addresses</span>
                      <span className="font-semibold">89</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Timing Analysis</span>
                      <span className="font-semibold">234</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Network Analysis</span>
                      <span className="font-semibold">67</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { type: "Tornado Cash", count: 45, risk: "critical" },
                      { type: "ChipMixer", count: 23, risk: "critical" },
                      { type: "Privacy Bridges", count: 18, risk: "high" },
                      { type: "Darknet Markets", count: 12, risk: "critical" },
                      { type: "Tumbler Services", count: 8, risk: "high" },
                    ].map((service, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">{service.type}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{service.count}</span>
                          {getRiskLevelBadge(service.risk)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fiat-ramp" className="space-y-4">
            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Fiat On/Off-Ramp Risk Analysis
                </CardTitle>
                <CardDescription>
                  Analyze connections between crypto wallets and Indian INR
                  transfers for FIU-IND compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Input
                    placeholder="Enter wallet address to analyze fiat connections"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    className="flex-1"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleFiatRampSearch()
                    }
                  />
                  <Button
                    onClick={handleFiatRampSearch}
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Analyze Fiat Risk
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Fiat Ramp Results */}
            {fiatRampRisk && (
              <div className="space-y-6">
                {/* Risk Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-red-600">
                            {fiatRampRisk.riskScore}
                          </div>
                          <div className="text-sm text-gray-600">
                            Overall Risk Score
                          </div>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">
                            {fiatRampRisk.fiatTransfers.length}
                          </div>
                          <div className="text-sm text-gray-600">
                            INR Transfers
                          </div>
                        </div>
                        <CreditCard className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">
                            ₹
                            {fiatRampRisk.fiatTransfers
                              .reduce((sum, t) => sum + t.amount, 0)
                              .toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            Total Volume
                          </div>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">
                            {fiatRampRisk.complianceChecks.amlScore}
                          </div>
                          <div className="text-sm text-gray-600">AML Score</div>
                        </div>
                        <Shield className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Fiat Transfers Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>INR Transfer History</CardTitle>
                    <CardDescription>
                      Bank transfers linked to this wallet address
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bank Details</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Amount (INR)</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fiatRampRisk.fiatTransfers.map((transfer, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {transfer.bankName}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {transfer.bankAccount} • {transfer.ifscCode}
                                </div>
                                {transfer.upiId && (
                                  <div className="text-xs text-gray-600">
                                    UPI: {transfer.upiId}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  transfer.direction === "deposit"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {transfer.direction === "deposit" ? "→" : "←"}{" "}
                                {transfer.direction}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold">
                                ₹{transfer.amount.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getPaymentMethodBadge(transfer.method)}
                            </TableCell>
                            <TableCell>
                              {new Date(
                                transfer.timestamp,
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {transfer.referenceNumber}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Risk Indicators & Compliance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                        Risk Indicators
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(fiatRampRisk.riskIndicators).map(
                          ([indicator, isPresent]) => (
                            <div
                              key={indicator}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm capitalize">
                                {indicator.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                              <div className="flex items-center space-x-2">
                                {isPresent ? (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <div className="h-4 w-4" />
                                )}
                                <Badge
                                  variant={
                                    isPresent ? "destructive" : "secondary"
                                  }
                                >
                                  {isPresent ? "Detected" : "Clear"}
                                </Badge>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-blue-500" />
                        Compliance Checks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(fiatRampRisk.complianceChecks).map(
                          ([check, value]) => (
                            <div
                              key={check}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm capitalize">
                                {check.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                              <div>
                                {typeof value === "boolean" ? (
                                  <Badge
                                    variant={
                                      value ? "secondary" : "destructive"
                                    }
                                  >
                                    {value ? "Completed" : "Pending"}
                                  </Badge>
                                ) : (
                                  <span className="font-semibold">{value}</span>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Regulatory Flags */}
                {fiatRampRisk.regulatoryFlags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-purple-500" />
                        Regulatory Flags (FIU-IND)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {fiatRampRisk.regulatoryFlags.map((flag, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 p-2 bg-red-50 rounded-lg"
                          >
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm">{flag}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <Button variant="destructive" className="w-full">
                          Generate STR Report for FIU-IND
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Empty State */}
            {!fiatRampRisk && (
              <Card>
                <CardContent className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Fiat Ramp Analysis Ready
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Enter a wallet address to analyze connections to Indian INR
                    transfers and assess compliance risk
                  </p>
                  <div className="text-sm text-gray-500">
                    <p>• Bank transfer linkage analysis</p>
                    <p>• UPI transaction detection</p>
                    <p>• Structured transaction patterns</p>
                    <p>• FIU-IND compliance screening</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detection Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        Time series chart showing detection trends over the last
                        30 days would be displayed here
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { country: "Russia", count: 45, percentage: 35 },
                      { country: "China", count: 32, percentage: 25 },
                      { country: "North Korea", count: 28, percentage: 22 },
                      { country: "Unknown", count: 23, percentage: 18 },
                    ].map((geo, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{geo.country}</span>
                          <span>
                            {geo.count} ({geo.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${geo.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Provider Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Tornado Cash Variants</span>
                      <span className="font-semibold">67%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ChipMixer Networks</span>
                      <span className="font-semibold">23%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cross-Chain Bridges</span>
                      <span className="font-semibold">18%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Darknet Markets</span>
                      <span className="font-semibold">12%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regulatory Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>STRs Generated</span>
                      <span className="font-semibold">156</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>FIU-IND Reports</span>
                      <span className="font-semibold">89</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Assets Frozen</span>
                      <span className="font-semibold">₹2.3Cr</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Investigations Opened</span>
                      <span className="font-semibold">34</span>
                    </div>
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
