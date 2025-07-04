import React, { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { traceTransaction } from "@/lib/api";
import type { Transaction } from "@/lib/types";
import {
  GitBranch,
  Search,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Copy,
  RefreshCw,
  Download,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function TransactionTracing() {
  const [searchHash, setSearchHash] = useState("");
  const [traceResults, setTraceResults] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [traceDepth, setTraceDepth] = useState(3);
  const [exporting, setExporting] = useState(false);

  const handleTrace = async () => {
    if (!searchHash.trim()) return;

    setLoading(true);
    try {
      const results = await traceTransaction(searchHash, traceDepth);
      setTraceResults(results);
      setSearchPerformed(true);
    } catch (error) {
      console.error("Error tracing transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    if (!searchPerformed || traceResults.length === 0) return;

    setExporting(true);
    try {
      // Create export data
      const exportData = {
        transactionHash: searchHash,
        traceDepth: traceDepth,
        timestamp: new Date().toISOString(),
        results: traceResults,
        summary: {
          totalTransactions: traceResults.length,
          chainsInvolved: new Set(traceResults.map(tx => tx.chain)).size,
          suspiciousTransactions: traceResults.filter(tx => tx.category === "suspicious").length,
          totalVolume: traceResults.reduce((sum, tx) => sum + tx.amount, 0)
        }
      };

      if (format === 'json') {
        // Export as JSON
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trace-${searchHash}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Export as CSV
        const headers = ['Hash', 'From', 'To', 'Amount', 'Currency', 'Chain', 'Timestamp', 'Risk Category', 'Risk Flags'];
        const csvContent = [
          headers.join(','),
          ...traceResults.map(tx => [
            tx.hash,
            tx.from,
            tx.to,
            tx.amount,
            tx.currency,
            tx.chain,
            tx.timestamp,
            tx.category,
            tx.riskFlags.join(';')
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trace-${searchHash}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // For PDF, we'll create a simple HTML report that can be printed
        const htmlContent = `
          <html>
            <head>
              <title>Transaction Trace Report - ${searchHash}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Transaction Trace Report</h1>
                <p>Transaction Hash: ${searchHash}</p>
                <p>Trace Depth: ${traceDepth}</p>
                <p>Generated: ${new Date().toISOString()}</p>
              </div>
              
              <div class="section">
                <h2>Trace Summary</h2>
                <div class="summary">
                  <p><strong>Total Transactions:</strong> ${exportData.summary.totalTransactions}</p>
                  <p><strong>Chains Involved:</strong> ${exportData.summary.chainsInvolved}</p>
                  <p><strong>Suspicious Transactions:</strong> ${exportData.summary.suspiciousTransactions}</p>
                  <p><strong>Total Volume:</strong> ${exportData.summary.totalVolume.toFixed(4)} ETH</p>
                </div>
              </div>
              
              <div class="section">
                <h2>Transaction Details</h2>
                <table>
                  <tr>
                    <th>Hash</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Amount</th>
                    <th>Chain</th>
                    <th>Risk</th>
                  </tr>
                  ${traceResults.map(tx => `
                    <tr>
                      <td>${tx.hash.slice(0, 8)}...</td>
                      <td>${tx.from.slice(0, 8)}...</td>
                      <td>${tx.to.slice(0, 8)}...</td>
                      <td>${tx.amount.toFixed(4)} ${tx.currency}</td>
                      <td>${tx.chain}</td>
                      <td>${tx.category}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            </body>
          </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trace-${searchHash}-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting trace:", error);
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getRiskBadge = (category: string) => {
    switch (category) {
      case "high-risk":
        return <Badge variant="destructive">High Risk</Badge>;
      case "suspicious":
        return <Badge variant="destructive">Suspicious</Badge>;
      case "normal":
        return <Badge variant="secondary">Normal</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getChainBadge = (chain: string) => {
    const colors = {
      ethereum: "bg-blue-100 text-blue-800",
      bitcoin: "bg-orange-100 text-orange-800",
      polygon: "bg-purple-100 text-purple-800",
    };
    return (
      <Badge
        variant="outline"
        className={colors[chain as keyof typeof colors] || ""}
      >
        {chain.toUpperCase()}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Transaction Tracing
          </h1>
          <p className="text-gray-600 mt-2">
            Trace blockchain transactions across multiple hops and networks to
            follow fund flows and identify patterns
          </p>
        </div>

        {/* Search & Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GitBranch className="h-5 w-5 mr-2" />
              Transaction Hash Tracing
            </CardTitle>
            <CardDescription>
              Enter a transaction hash to trace fund flows forwards and
              backwards through the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Input
                placeholder="Enter transaction hash (0x...)"
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === "Enter" && handleTrace()}
              />
              <Button onClick={handleTrace} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Trace Transaction
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Trace Depth:</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 5, 10].map((depth) => (
                    <Button
                      key={depth}
                      variant={traceDepth === depth ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTraceDepth(depth)}
                    >
                      {depth}
                    </Button>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExport('pdf')}
                  disabled={exporting || !searchPerformed}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExport('csv')}
                  disabled={exporting || !searchPerformed}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExport('json')}
                  disabled={exporting || !searchPerformed}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searchPerformed && traceResults.length > 0 && (
          <div className="space-y-6">
            {/* Trace Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {traceResults.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Transactions Found
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {new Set(traceResults.map((tx) => tx.chain)).size}
                  </div>
                  <div className="text-sm text-gray-600">Chains Involved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {
                      traceResults.filter((tx) => tx.category === "suspicious")
                        .length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Suspicious TXs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {traceResults
                      .reduce((sum, tx) => sum + tx.amount, 0)
                      .toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Volume (ETH)
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trace Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Trace Path</CardTitle>
                <CardDescription>
                  Visual representation of the transaction flow across {traceDepth} hops
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Simple trace visualization */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-4">
                    {traceResults.map((tx, index) => (
                      <div key={tx.hash} className="flex items-center space-x-2 flex-shrink-0">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="bg-gray-100 px-3 py-1 rounded text-xs font-mono">
                          {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                        </div>
                        <div className="text-gray-400">→</div>
                        <div className="bg-gray-100 px-3 py-1 rounded text-xs font-mono">
                          {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                        </div>
                        {index < traceResults.length - 1 && (
                          <div className="text-gray-400">→</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="transactions">All Transactions</TabsTrigger>
                <TabsTrigger value="suspicious">Suspicious Only</TabsTrigger>
                <TabsTrigger value="chains">Cross-Chain</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Trace Results</CardTitle>
                    <CardDescription>
                      Complete list of traced transactions with risk assessment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hop</TableHead>
                          <TableHead>Hash</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Chain</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {traceResults.map((tx, index) => (
                          <TableRow key={tx.hash}>
                            <TableCell>
                              <Badge variant="outline">{index + 1}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                            </TableCell>
                            <TableCell>
                              {tx.amount.toFixed(4)} {tx.currency}
                            </TableCell>
                            <TableCell>{getChainBadge(tx.chain)}</TableCell>
                            <TableCell className="text-xs">
                              {new Date(tx.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>{getRiskBadge(tx.category)}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(tx.hash)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`https://etherscan.io/tx/${tx.hash}`, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3" />
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

              <TabsContent value="suspicious" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                      Suspicious Transactions
                    </CardTitle>
                    <CardDescription>
                      Transactions flagged as suspicious during the trace
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {traceResults.filter((tx) => tx.category === "suspicious")
                      .length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hash</TableHead>
                            <TableHead>Risk Flags</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Chain</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {traceResults
                            .filter((tx) => tx.category === "suspicious")
                            .map((tx) => (
                              <TableRow key={tx.hash}>
                                <TableCell className="font-mono text-xs">
                                  {tx.hash.slice(0, 12)}...
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {tx.riskFlags.map((flag, i) => (
                                      <Badge
                                        key={i}
                                        variant="destructive"
                                        className="text-xs"
                                      >
                                        {flag}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {tx.amount.toFixed(4)} {tx.currency}
                                </TableCell>
                                <TableCell>{getChainBadge(tx.chain)}</TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm">
                                    Create Case
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Suspicious Activity
                        </h3>
                        <p className="text-gray-600">
                          All transactions in this trace appear to follow normal
                          patterns.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chains" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cross-Chain Analysis</CardTitle>
                    <CardDescription>
                      Breakdown of transaction flows across different
                      blockchains
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Array.from(
                        new Set(traceResults.map((tx) => tx.chain)),
                      ).map((chain) => {
                        const chainTxs = traceResults.filter(
                          (tx) => tx.chain === chain,
                        );
                        const totalVolume = chainTxs.reduce(
                          (sum, tx) => sum + tx.amount,
                          0,
                        );
                        const suspiciousCount = chainTxs.filter(
                          (tx) => tx.category === "suspicious",
                        ).length;

                        return (
                          <div key={chain} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                {getChainBadge(chain)}
                                <h3 className="font-semibold capitalize">
                                  {chain} Network
                                </h3>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {chainTxs.length} transactions
                                </div>
                                <div className="text-sm text-gray-600">
                                  {totalVolume.toFixed(4)}{" "}
                                  {chainTxs[0]?.currency || "ETH"}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Volume:</span>
                                <div className="font-semibold">
                                  {totalVolume.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Transactions:
                                </span>
                                <div className="font-semibold">
                                  {chainTxs.length}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Suspicious:
                                </span>
                                <div className="font-semibold text-red-600">
                                  {suspiciousCount}
                                </div>
                              </div>
                            </div>

                            <Progress
                              value={
                                (chainTxs.length / traceResults.length) * 100
                              }
                              className="mt-3"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Flow Pattern Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Direct transfers</span>
                          <span className="font-semibold">
                            {
                              traceResults.filter(
                                (tx) => tx.riskFlags.length === 0,
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Through intermediaries</span>
                          <span className="font-semibold">
                            {Math.floor(traceResults.length * 0.7)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Mixing services</span>
                          <span className="font-semibold text-orange-600">
                            {
                              traceResults.filter((tx) =>
                                tx.riskFlags.includes("mixer"),
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Exchange deposits</span>
                          <span className="font-semibold">
                            {Math.floor(traceResults.length * 0.3)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Assessment Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Overall risk score</span>
                          <span className="font-semibold text-orange-600">
                            Medium (65/100)
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Geographic risk</span>
                          <span className="font-semibold">Low</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Velocity risk</span>
                          <span className="font-semibold text-red-600">
                            High
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Entity risk</span>
                          <span className="font-semibold text-orange-600">
                            Medium
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <Button className="w-full">
                          Generate Detailed Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty State */}
        {!searchPerformed && (
          <Card>
            <CardContent className="text-center py-12">
              <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Transaction Traced Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Enter a transaction hash above to begin tracing fund flows
                across blockchain networks.
              </p>
              <div className="text-sm text-gray-500">
                <p>Supported networks: Ethereum, Bitcoin, Polygon, BSC</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
