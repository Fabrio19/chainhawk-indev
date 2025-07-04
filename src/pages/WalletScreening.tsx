import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KYCIdentityLinkage } from "@/components/KYCIdentityLinkage";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  searchWallet,
  getWalletTransactions,
  performSanctionScreening,
} from "@/services/apiService";
import type { Wallet, Transaction, SanctionHit } from "@/lib/types";
import {
  Search,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Copy,
  RefreshCw,
  CheckCircle,
  User,
  FileText,
} from "lucide-react";

export default function WalletScreening() {
  const [searchAddress, setSearchAddress] = useState("");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sanctions, setSanctions] = useState<SanctionHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchAddress.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const [walletData, transactionData, sanctionData] = await Promise.all([
        searchWallet(searchAddress),
        getWalletTransactions(searchAddress),
        performSanctionScreening(searchAddress),
      ]);

      setWallet(walletData);
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
      setSanctions(sanctionData);
      setSearchPerformed(true);
    } catch (error) {
      console.error("Error searching wallet:", error);
      setError("Failed to search wallet. Please check the address and try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600";
    if (score >= 60) return "text-orange-600";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return "High Risk";
    if (score >= 60) return "Medium Risk";
    if (score >= 40) return "Low Risk";
    return "No Risk";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wallet Screening</h1>
          <p className="text-gray-600 mt-2">
            Analyze wallet addresses for risk assessment and compliance
            screening
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Wallet Address Search
            </CardTitle>
            <CardDescription>
              Enter a wallet address to perform comprehensive risk analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Input
                placeholder="Enter wallet address (0x... or bc1...)"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Screen Wallet
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {searchPerformed && wallet && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {/* Hide KYC tab - not implemented in backend */}
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="sanctions">Sanctions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Wallet Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <p className="text-sm text-gray-600 font-mono">{wallet?.address || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Risk Score</label>
                      <Badge variant={wallet?.riskScore > 70 ? "destructive" : wallet?.riskScore > 40 ? "default" : "secondary"}>
                        {wallet?.riskScore || 0}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <div className="flex items-center gap-2">
                        {wallet?.isBlacklisted ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <span>{wallet?.isBlacklisted ? "Blacklisted" : "Clear"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Balance</label>
                      <p className="text-sm text-gray-600">
                        {typeof wallet?.balance === "number"
                          ? `$${wallet.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hash</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Counterparty</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length > 0 ? (
                        transactions.map((tx) => (
                          <TableRow key={tx.hash}>
                            <TableCell className="font-mono text-xs">
                              {tx.hash?.slice(0, 10)}...
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {tx.from === wallet?.address ? (
                                  <>
                                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                                    <span className="text-red-600">Out</span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                                    <span className="text-green-600">In</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {tx.amount?.toFixed(4) || "N/A"} {tx.currency || ""}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {(tx.from === wallet?.address ? tx.to : tx.from)
                                ?.slice(0, 8)
                                .concat("...") || "N/A"}
                            </TableCell>
                            <TableCell>
                              {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  tx.category === "suspicious"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {tx.category || "normal"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sanctions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sanctions Check</CardTitle>
                </CardHeader>
                <CardContent>
                  {sanctions.length > 0 ? (
                    <div className="space-y-2">
                      {sanctions.map((hit, index) => (
                        <Badge key={index} variant="destructive">
                          {hit.sanctionList}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-600">No sanctions found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!searchPerformed && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Wallet Searched Yet
              </h3>
              <p className="text-gray-600">
                Enter a wallet address above to begin comprehensive risk
                screening and compliance analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
