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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  getEntityRiskProfiles,
  getCounterpartyExposure,
  type EntityRiskProfile,
  type CounterpartyExposure,
} from "@/lib/advanced-api";
import {
  User,
  Building,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Eye,
  BarChart3,
  PieChart,
  ExternalLink,
  Search,
  RefreshCw,
  Download,
  Plus,
  Calendar,
  Loader2,
} from "lucide-react";

export default function EntityRiskProfiles() {
  const [profiles, setProfiles] = useState<EntityRiskProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<EntityRiskProfile[]>(
    [],
  );
  const [selectedProfile, setSelectedProfile] =
    useState<EntityRiskProfile | null>(null);
  const [counterpartyExposure, setCounterpartyExposure] =
    useState<CounterpartyExposure | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEntityData();
  }, []);

  // Filter profiles based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProfiles(profiles);
    } else {
      const filtered = profiles.filter(
        (profile) =>
          profile.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          profile.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          profile.entityType.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredProfiles(filtered);
    }
  }, [profiles, searchTerm]);

  const loadEntityData = async () => {
    try {
      setError(null);
      const profilesData = await getEntityRiskProfiles();
      setProfiles(profilesData);
      setFilteredProfiles(profilesData);

      if (profilesData.length > 0) {
        setSelectedProfile(profilesData[0]);
        await loadCounterpartyData(profilesData[0].entityId);
      }

      toast({
        title: "Data Loaded",
        description: `${profilesData.length} entity profiles loaded successfully`,
      });
    } catch (error) {
      console.error("Error loading entity data:", error);
      setError("Failed to load entity profiles. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load entity profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCounterpartyData = async (entityId: string) => {
    try {
      const exposureData = await getCounterpartyExposure(entityId);
      setCounterpartyExposure(exposureData);
    } catch (error) {
      console.error("Error loading counterparty data:", error);
      toast({
        title: "Warning",
        description: "Failed to load counterparty exposure data",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEntityData();
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleAnalyzeWallet = (walletAddress: string) => {
    toast({
      title: "Analysis Started",
      description: `Analyzing wallet ${walletAddress.slice(0, 10)}...`,
    });
    // In a real app, this would navigate to wallet analysis page
  };

  const handleScheduleReview = (entityId: string) => {
    toast({
      title: "Review Scheduled",
      description: `Compliance review scheduled for entity ${entityId}`,
    });
  };

  const handleExportProfile = (profile: EntityRiskProfile) => {
    toast({
      title: "Export Started",
      description: `Exporting profile for ${profile.entityName}`,
    });
  };

  const handleProfileSelect = (profile: EntityRiskProfile) => {
    setSelectedProfile(profile);
    loadCounterpartyData(profile.entityId);
  };

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case "individual":
        return <User className="h-4 w-4" />;
      case "business":
        return <Building className="h-4 w-4" />;
      case "institution":
        return <Building className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600";
    if (score >= 60) return "text-orange-600";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const getRiskBgColor = (score: number) => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getComplianceStatusBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge variant="secondary">Compliant</Badge>;
      case "monitoring":
        return <Badge variant="default">Monitoring</Badge>;
      case "investigation":
        return <Badge variant="destructive">Investigation</Badge>;
      case "restricted":
        return <Badge variant="destructive">Restricted</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getKycLevelBadge = (level: string) => {
    const colors = {
      none: "bg-red-100 text-red-800",
      basic: "bg-yellow-100 text-yellow-800",
      standard: "bg-blue-100 text-blue-800",
      enhanced: "bg-green-100 text-green-800",
    };
    return (
      <Badge
        variant="outline"
        className={colors[level as keyof typeof colors] || ""}
      >
        {level.toUpperCase()}
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Loading entity profiles...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error Loading Data
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Entity Risk Profiles
            </h1>
            <p className="text-gray-600 mt-2">
              Aggregate risk scoring for entities with multiple wallets and
              comprehensive counterparty exposure analysis
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Entity
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {filteredProfiles.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    {searchTerm ? "Filtered" : "Total"} Entities
                  </div>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {
                      filteredProfiles.filter((p) => p.aggregateRiskScore >= 70)
                        .length
                    }
                  </div>
                  <div className="text-sm text-gray-600">High Risk</div>
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
                    {
                      filteredProfiles.filter((p) => p.kycLevel === "enhanced")
                        .length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Enhanced KYC</div>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {
                      filteredProfiles.filter(
                        (p) => p.complianceStatus === "compliant",
                      ).length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Compliant</div>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entity List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Entity Profiles</CardTitle>
                <CardDescription>
                  Click on an entity to view detailed risk profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredProfiles.length === 0 && searchTerm ? (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-8 w-8 mx-auto mb-2" />
                      <p>No entities found matching "{searchTerm}"</p>
                    </div>
                  ) : (
                    filteredProfiles.map((profile) => (
                      <div
                        key={profile.entityId}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedProfile?.entityId === profile.entityId
                            ? "bg-blue-50 border-blue-200"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleProfileSelect(profile)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getEntityTypeIcon(profile.entityType)}
                            <span className="font-medium text-sm">
                              {profile.entityName}
                            </span>
                          </div>
                          <div
                            className={`text-lg font-bold ${getRiskColor(profile.aggregateRiskScore)}`}
                          >
                            {profile.aggregateRiskScore}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          {getKycLevelBadge(profile.kycLevel)}
                          {getComplianceStatusBadge(profile.complianceStatus)}
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          {profile.linkedWallets.length} wallet(s) •{" "}
                          {profile.entityType}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Entity Details */}
          <div className="lg:col-span-2">
            {selectedProfile ? (
              <div className="space-y-6">
                {/* Profile Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          {getEntityTypeIcon(selectedProfile.entityType)}
                          <span>{selectedProfile.entityName}</span>
                          {getComplianceStatusBadge(
                            selectedProfile.complianceStatus,
                          )}
                        </CardTitle>
                        <CardDescription>
                          {selectedProfile.entityId} •{" "}
                          {selectedProfile.entityType}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportProfile(selectedProfile)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <div className="text-right">
                          <div
                            className={`text-3xl font-bold ${getRiskColor(selectedProfile.aggregateRiskScore)}`}
                          >
                            {selectedProfile.aggregateRiskScore}
                          </div>
                          <div className="text-sm text-gray-600">
                            Risk Score
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <span className="text-sm text-gray-600">
                          KYC Level:
                        </span>
                        <div className="mt-1">
                          {getKycLevelBadge(selectedProfile.kycLevel)}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">
                          Linked Wallets:
                        </span>
                        <div className="font-semibold">
                          {selectedProfile.linkedWallets.length}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">
                          Last Review:
                        </span>
                        <div className="font-semibold">
                          {new Date(
                            selectedProfile.lastReview,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">
                          Next Review:
                        </span>
                        <div className="font-semibold">
                          {new Date(
                            selectedProfile.nextReview,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Risk Factors */}
                    <div>
                      <h4 className="font-semibold mb-3">
                        Risk Factor Breakdown
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(selectedProfile.riskFactors).map(
                          ([factor, score]) => (
                            <div key={factor}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="capitalize">
                                  {factor.replace(/([A-Z])/g, " $1").trim()}
                                </span>
                                <span className="font-semibold">
                                  {score.toFixed(0)}%
                                </span>
                              </div>
                              <Progress value={score} className="h-2" />
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Tabs */}
                <Tabs defaultValue="exposure" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="exposure">Exposure</TabsTrigger>
                    <TabsTrigger value="wallets">Wallets</TabsTrigger>
                    <TabsTrigger value="relationships">Relations</TabsTrigger>
                    <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  </TabsList>

                  <TabsContent value="exposure" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <PieChart className="h-4 w-4 mr-2" />
                            Volume Breakdown
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Total Volume</span>
                              <span className="font-semibold">
                                $
                                {selectedProfile.exposures.totalVolume.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>High Risk Volume</span>
                              <span className="font-semibold text-red-600">
                                $
                                {selectedProfile.exposures.highRiskVolume.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Sanctioned Volume</span>
                              <span className="font-semibold text-red-600">
                                $
                                {selectedProfile.exposures.sanctionedVolume.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Mixer Volume</span>
                              <span className="font-semibold text-orange-600">
                                $
                                {selectedProfile.exposures.mixerVolume.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Exchange Volume</span>
                              <span className="font-semibold text-green-600">
                                $
                                {selectedProfile.exposures.exchangeVolume.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {counterpartyExposure && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Counterparty Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span>High Risk Exposure</span>
                                <span className="font-semibold text-red-600">
                                  {counterpartyExposure.summary.highRiskPercentage.toFixed(
                                    1,
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Trend Direction</span>
                                <div className="flex items-center space-x-1">
                                  {counterpartyExposure.trends.direction ===
                                  "increasing" ? (
                                    <TrendingUp className="h-4 w-4 text-red-500" />
                                  ) : counterpartyExposure.trends.direction ===
                                    "decreasing" ? (
                                    <TrendingDown className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <div className="h-4 w-4" />
                                  )}
                                  <span className="capitalize">
                                    {counterpartyExposure.trends.direction}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Monthly Change</span>
                                <span
                                  className={`font-semibold ${
                                    counterpartyExposure.trends.monthlyChange >
                                    0
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {counterpartyExposure.trends.monthlyChange > 0
                                    ? "+"
                                    : ""}
                                  {counterpartyExposure.trends.monthlyChange.toFixed(
                                    1,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Counterparty Table */}
                    {counterpartyExposure && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Top Counterparties</CardTitle>
                          <CardDescription>
                            Entities this profile has transacted with
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Counterparty</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Risk Level</TableHead>
                                <TableHead>Volume</TableHead>
                                <TableHead>Percentage</TableHead>
                                <TableHead>Transactions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {counterpartyExposure.counterparties
                                .sort((a, b) => b.percentage - a.percentage)
                                .slice(0, 8)
                                .map((cp, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <div className="font-medium">
                                        {cp.name}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className="capitalize"
                                      >
                                        {cp.type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {getRiskLevelBadge(cp.riskLevel)}
                                    </TableCell>
                                    <TableCell>
                                      $
                                      {(
                                        cp.volumeReceived + cp.volumeSent
                                      ).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center space-x-2">
                                        <div
                                          className={`w-3 h-3 rounded ${getRiskBgColor(cp.percentage * 5)}`}
                                        ></div>
                                        <span>{cp.percentage.toFixed(1)}%</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>{cp.transactionCount}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="wallets" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Linked Wallets</CardTitle>
                        <CardDescription>
                          All wallet addresses associated with this entity
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedProfile.linkedWallets.map(
                            (wallet, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <div>
                                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                      {wallet}
                                    </code>
                                    <div className="text-xs text-gray-600 mt-1">
                                      Wallet {index + 1}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAnalyzeWallet(wallet)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Analyze
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      window.open(
                                        `https://etherscan.io/address/${wallet}`,
                                        "_blank",
                                      )
                                    }
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="relationships" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Entity Relationships</CardTitle>
                        <CardDescription>
                          Connected entities and their relationship types
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-gray-500">
                          <User className="h-12 w-12 mx-auto mb-4" />
                          <p>No relationships detected yet</p>
                          <Button variant="outline" className="mt-4">
                            Analyze Relationships
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="compliance" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Compliance History</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-600">
                              Current Status:
                            </span>
                            <div className="mt-1">
                              {getComplianceStatusBadge(
                                selectedProfile.complianceStatus,
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">
                              KYC Level:
                            </span>
                            <div className="mt-1">
                              {getKycLevelBadge(selectedProfile.kycLevel)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Last Compliance Review:</span>
                            <span className="font-semibold">
                              {new Date(
                                selectedProfile.lastReview,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Next Scheduled Review:</span>
                            <span className="font-semibold">
                              {new Date(
                                selectedProfile.nextReview,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Compliance Score:</span>
                            <span className="font-semibold text-green-600">
                              {selectedProfile.riskFactors.complianceHistory.toFixed(
                                0,
                              )}
                              %
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <Button
                            className="w-full"
                            onClick={() =>
                              handleScheduleReview(selectedProfile.entityId)
                            }
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule Compliance Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select an Entity
                  </h3>
                  <p className="text-gray-600">
                    Choose an entity from the list to view detailed risk profile
                    and counterparty exposure analysis
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </DashboardLayout>
  );
}
