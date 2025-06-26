import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  performSanctionScreening,
  performPEPScreening,
  type SanctionHit,
  type PEPRecord,
} from "@/lib/api";
import {
  Shield,
  Search,
  AlertTriangle,
  User,
  Globe,
  Flag,
  RefreshCw,
  Download,
  CheckCircle,
} from "lucide-react";

export default function ComplianceScreening() {
  const [searchType, setSearchType] = useState<"wallet" | "name">("wallet");
  const [searchQuery, setSearchQuery] = useState("");
  const [sanctionHits, setSanctionHits] = useState<SanctionHit[]>([]);
  const [pepRecords, setPepRecords] = useState<PEPRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSanctionHits([]);
    setPepRecords([]);

    try {
      if (searchType === "wallet") {
        const sanctions = await performSanctionScreening(searchQuery);
        setSanctionHits(sanctions);
      } else {
        const peps = await performPEPScreening(searchQuery);
        setPepRecords(peps);
      }
      setSearchPerformed(true);
    } catch (error) {
      console.error("Error performing screening:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSanctionListBadge = (list: string) => {
    const colors = {
      OFAC: "bg-red-100 text-red-800",
      UN: "bg-blue-100 text-blue-800",
      EU: "bg-purple-100 text-purple-800",
      India: "bg-orange-100 text-orange-800",
    };
    return (
      <Badge
        variant="outline"
        className={colors[list as keyof typeof colors] || ""}
      >
        {list}
      </Badge>
    );
  };

  const getRiskLevelBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge variant="destructive">High Risk</Badge>;
      case "medium":
        return <Badge variant="default">Medium Risk</Badge>;
      case "low":
        return <Badge variant="secondary">Low Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Compliance Screening
          </h1>
          <p className="text-gray-600 mt-2">
            Screen against sanction lists (OFAC, UN, EU, India) and check for
            Politically Exposed Persons (PEP)
          </p>
        </div>

        {/* Search Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Compliance Search
            </CardTitle>
            <CardDescription>
              Search wallet addresses or individual names against global
              compliance databases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex space-x-2">
                <Button
                  variant={searchType === "wallet" ? "default" : "outline"}
                  onClick={() => setSearchType("wallet")}
                  size="sm"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Wallet Address
                </Button>
                <Button
                  variant={searchType === "name" ? "default" : "outline"}
                  onClick={() => setSearchType("name")}
                  size="sm"
                >
                  <User className="h-4 w-4 mr-2" />
                  Individual Name
                </Button>
              </div>
            </div>

            <div className="flex space-x-4">
              <Input
                placeholder={
                  searchType === "wallet"
                    ? "Enter wallet address (0x... or bc1...)"
                    : "Enter individual name"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Screen
              </Button>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span>OFAC: Updated today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span>UN: Updated today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span>EU: Updated today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span>India: Updated today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searchPerformed && (
          <div className="space-y-6">
            {/* Sanctions Results */}
            {searchType === "wallet" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Flag className="h-5 w-5 mr-2" />
                      Sanction Screening Results
                    </span>
                    {sanctionHits.length > 0 ? (
                      <Badge variant="destructive">
                        {sanctionHits.length} Hit(s) Found
                      </Badge>
                    ) : (
                      <Badge variant="secondary">No Matches</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Results from OFAC, UN, EU, and India sanction lists
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sanctionHits.length > 0 ? (
                    <div className="space-y-4">
                      {sanctionHits.map((hit, index) => (
                        <Alert key={index} className="border-red-200 bg-red-50">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {getSanctionListBadge(hit.sanctionList)}
                                  <Badge variant="destructive">
                                    {hit.confidence}% Match
                                  </Badge>
                                  <Badge variant="outline">
                                    {hit.matchType}
                                  </Badge>
                                </div>
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Export Hit
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Entity:</strong> {hit.entity}
                                </div>
                                <div>
                                  <strong>Date Added:</strong> {hit.dateAdded}
                                </div>
                                <div className="md:col-span-2">
                                  <strong>Reason:</strong> {hit.reason}
                                </div>
                              </div>

                              <div className="flex space-x-2 pt-2">
                                <Button variant="destructive" size="sm">
                                  Create STR
                                </Button>
                                <Button variant="outline" size="sm">
                                  Add to Watchlist
                                </Button>
                                <Button variant="outline" size="sm">
                                  View Full Record
                                </Button>
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>No sanctions matches found.</strong> This wallet
                        address does not appear on any monitored sanction lists
                        (OFAC, UN, EU, India).
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PEP Results */}
            {searchType === "name" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      PEP Screening Results
                    </span>
                    {pepRecords.length > 0 ? (
                      <Badge variant="destructive">
                        {pepRecords.length} Record(s) Found
                      </Badge>
                    ) : (
                      <Badge variant="secondary">No Matches</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Politically Exposed Persons database screening
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pepRecords.length > 0 ? (
                    <div className="space-y-4">
                      {pepRecords.map((record, index) => (
                        <Alert
                          key={index}
                          className="border-orange-200 bg-orange-50"
                        >
                          <User className="h-4 w-4 text-orange-600" />
                          <AlertDescription>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-semibold text-orange-800">
                                    {record.name}
                                  </h3>
                                  {getRiskLevelBadge(record.riskLevel)}
                                </div>
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Export Record
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Country:</strong> {record.country}
                                </div>
                                <div>
                                  <strong>Position:</strong> {record.position}
                                </div>
                                <div>
                                  <strong>Last Updated:</strong>{" "}
                                  {record.lastUpdated}
                                </div>
                                <div>
                                  <strong>Risk Level:</strong>{" "}
                                  {record.riskLevel.toUpperCase()}
                                </div>
                                <div className="md:col-span-2">
                                  <strong>Political Exposure:</strong>{" "}
                                  {record.politicalExposure}
                                </div>
                                <div className="md:col-span-2">
                                  <strong>Source of Wealth:</strong>{" "}
                                  {record.sourceOfWealth}
                                </div>
                              </div>

                              <div className="flex space-x-2 pt-2">
                                <Button variant="default" size="sm">
                                  Enhanced Due Diligence
                                </Button>
                                <Button variant="outline" size="sm">
                                  Create Case
                                </Button>
                                <Button variant="outline" size="sm">
                                  View Full Profile
                                </Button>
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>No PEP records found.</strong> This individual
                        does not appear in the Politically Exposed Persons
                        database.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Compliance Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Screening Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Search Type:</span>
                      <span className="font-semibold capitalize">
                        {searchType === "wallet"
                          ? "Wallet Address"
                          : "Individual Name"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Query:</span>
                      <span className="font-mono text-xs">
                        {searchQuery.length > 20
                          ? `${searchQuery.slice(0, 20)}...`
                          : searchQuery}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sanction Hits:</span>
                      <span
                        className={`font-semibold ${
                          sanctionHits.length > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {sanctionHits.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>PEP Records:</span>
                      <span
                        className={`font-semibold ${
                          pepRecords.length > 0
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {pepRecords.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overall Risk:</span>
                      <span
                        className={`font-semibold ${
                          sanctionHits.length > 0
                            ? "text-red-600"
                            : pepRecords.length > 0
                              ? "text-orange-600"
                              : "text-green-600"
                        }`}
                      >
                        {sanctionHits.length > 0
                          ? "High"
                          : pepRecords.length > 0
                            ? "Medium"
                            : "Low"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sanctionHits.length > 0 && (
                    <Alert className="p-3">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-sm">
                        <strong>Immediate Action Required:</strong> Sanction hit
                        detected. File STR and freeze assets immediately.
                      </AlertDescription>
                    </Alert>
                  )}

                  {pepRecords.length > 0 && (
                    <Alert className="p-3">
                      <User className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-sm">
                        <strong>Enhanced Due Diligence:</strong> PEP identified.
                        Conduct additional KYC and ongoing monitoring.
                      </AlertDescription>
                    </Alert>
                  )}

                  {sanctionHits.length === 0 && pepRecords.length === 0 && (
                    <Alert className="p-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm">
                        <strong>Clear to Proceed:</strong> No compliance issues
                        identified. Standard monitoring applies.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="pt-2 space-y-2">
                    <Button className="w-full" size="sm">
                      Generate Compliance Report
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      Add to Monitoring List
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!searchPerformed && (
          <Card>
            <CardContent className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready for Compliance Screening
              </h3>
              <p className="text-gray-600 mb-4">
                Search wallet addresses or individual names against global
                sanction lists and PEP databases.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• OFAC (US Office of Foreign Assets Control)</p>
                <p>• UN Security Council Sanctions</p>
                <p>• EU Consolidated List</p>
                <p>• India Ministry of External Affairs</p>
                <p>• Global PEP Database</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
