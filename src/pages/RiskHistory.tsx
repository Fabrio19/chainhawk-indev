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
import {
  getWalletRiskHistory,
  type WalletRiskHistory,
} from "@/lib/advanced-api";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Search,
  RefreshCw,
  AlertTriangle,
  Calendar,
  BarChart3,
} from "lucide-react";

export default function RiskHistory() {
  const [searchAddress, setSearchAddress] = useState("");
  const [riskHistory, setRiskHistory] = useState<WalletRiskHistory | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchAddress.trim()) return;

    setLoading(true);
    try {
      const data = await getWalletRiskHistory(searchAddress);
      setRiskHistory(data);
    } catch (error) {
      console.error("Error loading risk history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getRiskTextColor = (score: number) => {
    if (score >= 80) return "text-red-600";
    if (score >= 60) return "text-orange-600";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Risk Score History
          </h1>
          <p className="text-gray-600 mt-2">
            Track wallet risk score changes over time for compliance reviews and
            trend analysis
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-4">
              <Input
                placeholder="Enter wallet address to view risk history"
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
                Analyze History
              </Button>
            </div>
          </CardContent>
        </Card>

        {riskHistory && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className={`text-2xl font-bold ${getRiskTextColor(riskHistory.history[riskHistory.history.length - 1]?.riskScore || 0)}`}
                      >
                        {riskHistory.history[
                          riskHistory.history.length - 1
                        ]?.riskScore.toFixed(0) || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Current Risk Score
                      </div>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold flex items-center space-x-2">
                        {getTrendIcon(riskHistory.trends.direction)}
                        <span className="capitalize">
                          {riskHistory.trends.direction}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">Risk Trend</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">
                        {riskHistory.trends.velocity.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Change Velocity
                      </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">
                        {riskHistory.trends.volatility.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">Volatility</div>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeline Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Risk Score Timeline
                </CardTitle>
                <CardDescription>
                  Historical risk score changes with triggering events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Simple timeline chart */}
                  <div className="relative h-64 bg-gray-50 rounded-lg p-4">
                    <div className="h-full flex items-end space-x-1">
                      {riskHistory.history.map((point, index) => (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center"
                        >
                          <div
                            className={`w-full ${getRiskColor(point.riskScore)} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                            style={{
                              height: `${(point.riskScore / 100) * 200}px`,
                            }}
                            title={`${new Date(point.timestamp).toLocaleDateString()}: ${point.riskScore} (${point.reason})`}
                          ></div>
                          {index % 5 === 0 && (
                            <div className="text-xs text-gray-600 mt-1 transform -rotate-45">
                              {new Date(point.timestamp).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600">
                      <span>100</span>
                      <span>75</span>
                      <span>50</span>
                      <span>25</span>
                      <span>0</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Low Risk (0-40)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span>Medium Risk (41-60)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>High Risk (61-80)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span>Critical Risk (81-100)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Significant Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Significant Risk Changes</CardTitle>
                  <CardDescription>
                    Events that caused major risk score fluctuations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {riskHistory.milestones.significantChanges
                      .slice(0, 5)
                      .map((change, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 border rounded-lg"
                        >
                          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <Badge
                                variant={
                                  change.riskScore > 70
                                    ? "destructive"
                                    : change.riskScore > 40
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {change.riskScore}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {new Date(
                                  change.timestamp,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="font-medium mt-1">
                              {change.reason}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Confidence: {change.confidence.toFixed(0)}% •
                              Triggered by:{" "}
                              {change.triggeredBy.replace("_", " ")}
                            </p>
                            {change.evidence.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">
                                  Evidence:
                                </p>
                                <ul className="text-xs text-gray-600 list-disc list-inside">
                                  {change.evidence.map((evidence, i) => (
                                    <li key={i}>{evidence}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Milestones</CardTitle>
                  <CardDescription>
                    Key moments in this wallet's risk profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <div className="font-medium">First Seen</div>
                        <div className="text-sm text-gray-600">
                          Wallet first detected by system
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {new Date(
                            riskHistory.milestones.firstSeen,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium">Highest Risk</div>
                        <div className="text-sm text-gray-600">
                          {riskHistory.milestones.highestRisk.reason}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          {riskHistory.milestones.highestRisk.riskScore}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(
                            riskHistory.milestones.highestRisk.timestamp,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium">Lowest Risk</div>
                        <div className="text-sm text-gray-600">
                          {riskHistory.milestones.lowestRisk.reason}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {riskHistory.milestones.lowestRisk.riskScore}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(
                            riskHistory.milestones.lowestRisk.timestamp,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Risk Analysis Summary</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• Total data points: {riskHistory.history.length}</p>
                      <p>
                        • Monitoring period:{" "}
                        {Math.ceil(
                          (new Date().getTime() -
                            new Date(
                              riskHistory.milestones.firstSeen,
                            ).getTime()) /
                            (1000 * 60 * 60 * 24),
                        )}{" "}
                        days
                      </p>
                      <p>
                        • Significant changes:{" "}
                        {riskHistory.milestones.significantChanges.length}
                      </p>
                      <p>
                        • Average risk score:{" "}
                        {(
                          riskHistory.history.reduce(
                            (sum, point) => sum + point.riskScore,
                            0,
                          ) / riskHistory.history.length
                        ).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent History Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Risk Score Changes</CardTitle>
                <CardDescription>
                  Detailed view of the last 10 risk score updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskHistory.history
                    .slice(-10)
                    .reverse()
                    .map((point, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-3 h-3 rounded-full ${getRiskColor(point.riskScore)}`}
                          ></div>
                          <div>
                            <div className="font-medium">{point.reason}</div>
                            <div className="text-sm text-gray-600">
                              Triggered by:{" "}
                              {point.triggeredBy.replace("_", " ")} •
                              Confidence: {point.confidence.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-semibold ${getRiskTextColor(point.riskScore)}`}
                          >
                            {point.riskScore}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(point.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!riskHistory && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Risk History Analysis Ready
              </h3>
              <p className="text-gray-600 mb-4">
                Enter a wallet address to view detailed risk score history and
                trend analysis
              </p>
              <div className="text-sm text-gray-500">
                <p>• Track risk score changes over time</p>
                <p>• Identify significant events and triggers</p>
                <p>• Analyze compliance review patterns</p>
                <p>• Export historical data for reporting</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
