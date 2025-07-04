import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiService } from '@/services/apiService';
import { ArrowRight, AlertTriangle, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-react';

interface BridgeTransaction {
  id: string;
  bridgeProtocol: 'STARGATE' | 'WORMHOLE' | 'SYNAPSE' | 'CELER';
  sourceChain: string;
  destinationChain: string;
  sourceAddress: string;
  destinationAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  eventType: string;
  timestamp: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  riskScore: number;
  riskFlags: string[];
  metadata: any;
}

interface BridgeStats {
  totalTransactions: number;
  highRiskTransactions: number;
  protocolStats: Array<{
    bridgeProtocol: string;
    status: string;
    _count: { id: number };
    _sum: { amount: number };
  }>;
  monitoringStatus: {
    isMonitoring: boolean;
    monitoringMode: string;
  };
}

export default function BridgeMonitoring() {
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [stats, setStats] = useState<BridgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('ALL');
  const [selectedChain, setSelectedChain] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const protocols = [
    { value: 'ALL', label: 'All Protocols' },
    { value: 'STARGATE', label: 'Stargate (LayerZero)' },
    { value: 'WORMHOLE', label: 'Wormhole (Portal)' },
    { value: 'SYNAPSE', label: 'Synapse Protocol' },
    { value: 'CELER', label: 'Celer cBridge' }
  ];

  const chains = [
    { value: 'ALL', label: 'All Chains' },
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'bsc', label: 'BSC' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'arbitrum', label: 'Arbitrum' },
    { value: 'optimism', label: 'Optimism' },
    { value: 'avalanche', label: 'Avalanche' }
  ];

  const statuses = [
    { value: 'ALL', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' }
  ];

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [transactionsResponse, statsResponse] = await Promise.all([
        apiService.getBridgeTransactions(),
        apiService.getBridgeStats()
      ]);
      
      if (transactionsResponse.success && transactionsResponse.data) {
        setTransactions(transactionsResponse.data.transactions || []);
      }
      
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching bridge data:', error);
      setError('Failed to load bridge monitoring data. Please try again.');
      setTransactions([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case 'STARGATE': return 'bg-blue-100 text-blue-800';
      case 'WORMHOLE': return 'bg-purple-100 text-purple-800';
      case 'SYNAPSE': return 'bg-green-100 text-green-800';
      case 'CELER': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'FAILED':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 0.7) return 'text-red-600';
    if (riskScore >= 0.4) return 'text-yellow-600';
    return 'text-green-600';
  };

  const filteredTransactions = transactions.filter(tx => {
    if (selectedProtocol !== 'ALL' && tx.bridgeProtocol !== selectedProtocol) return false;
    if (selectedChain !== 'ALL' && tx.sourceChain !== selectedChain && tx.destinationChain !== selectedChain) return false;
    if (selectedStatus !== 'ALL' && tx.status !== selectedStatus) return false;
    return true;
  });

  const formatAmount = (amount: string, tokenSymbol: string) => {
    const num = parseFloat(amount);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M ${tokenSymbol}`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K ${tokenSymbol}`;
    return `${num.toFixed(2)} ${tokenSymbol}`;
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Bridge Monitoring</h1>
            <p className="text-gray-600">Real-time cross-chain bridge transaction monitoring</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className="h-4 w-4 mr-2" />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
            <Button onClick={fetchData} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Monitoring Status Alert */}
        {!loading && !error && stats?.monitoringStatus && (
          <Alert className={stats.monitoringStatus.isMonitoring ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              Bridge monitoring is currently <strong>{stats.monitoringStatus.isMonitoring ? 'ACTIVE' : 'INACTIVE'}</strong> 
              in <strong>{stats.monitoringStatus.monitoringMode}</strong> mode
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        {!loading && !error && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.highRiskTransactions.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Protocols</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.protocolStats.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.highRiskTransactions > 0 ? 'High' : 'Low'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    {protocols.map(protocol => (
                      <SelectItem key={protocol.value} value={protocol.value}>
                        {protocol.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {chains.map(chain => (
                      <SelectItem key={chain.value} value={chain.value}>
                        {chain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-sm text-gray-500 flex items-center">
                  Showing {filteredTransactions.length} of {transactions.length} transactions
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Bridge Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead></TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge className={getProtocolColor(tx.bridgeProtocol)}>
                          {tx.bridgeProtocol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{tx.sourceChain}</div>
                          <div className="text-sm text-gray-500 font-mono">
                            {shortenAddress(tx.sourceAddress)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{tx.destinationChain}</div>
                          <div className="text-sm text-gray-500 font-mono">
                            {shortenAddress(tx.destinationAddress)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.tokenSymbol}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatAmount(tx.amount, tx.tokenSymbol)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tx.status)}
                          <span className="capitalize">{tx.status.toLowerCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`font-medium ${getRiskColor(tx.riskScore)}`}>
                            {(tx.riskScore * 100).toFixed(0)}%
                          </div>
                          <Progress value={tx.riskScore * 100} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No transactions found matching the current filters
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 