import { useState, useEffect, useRef } from "react";
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
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getTransactionGraph,
  type GraphData,
  type GraphNode,
} from "@/lib/advanced-api";
import {
  GitBranch,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Filter,
  Settings,
  Eye,
  Move,
  Square,
  Circle,
  Triangle,
} from "lucide-react";

export default function GraphVisualization() {
  const [searchAddress, setSearchAddress] = useState("");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState([100]);
  const [showLabels, setShowLabels] = useState(true);
  const [nodeSize, setNodeSize] = useState([10]);
  const [edgeThickness, setEdgeThickness] = useState([2]);
  const [colorBy, setColorBy] = useState("type");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSearch = async () => {
    if (!searchAddress.trim()) return;

    setLoading(true);
    try {
      const data = await getTransactionGraph(searchAddress);
      setGraphData(data);
    } catch (error) {
      console.error("Error loading graph:", error);
    } finally {
      setLoading(false);
    }
  };

  // Simple canvas-based graph rendering
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = zoomLevel[0] / 100;

    // Draw edges first
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = edgeThickness[0];
    graphData.edges.forEach((edge) => {
      const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
      const targetNode = graphData.nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(
          centerX + sourceNode.position.x * scale,
          centerY + sourceNode.position.y * scale,
        );
        ctx.lineTo(
          centerX + targetNode.position.x * scale,
          centerY + targetNode.position.y * scale,
        );
        ctx.stroke();
      }
    });

    // Draw nodes
    graphData.nodes.forEach((node) => {
      const x = centerX + node.position.x * scale;
      const y = centerY + node.position.y * scale;
      const radius = nodeSize[0] * (node.type === "wallet" ? 1.5 : 1);

      // Node color based on type or risk
      let color = "#64748b";
      if (colorBy === "type") {
        const typeColors = {
          wallet: "#3b82f6",
          exchange: "#10b981",
          mixer: "#ef4444",
          entity: "#f59e0b",
          transaction: "#8b5cf6",
          bridge: "#ec4899",
        };
        color = typeColors[node.type as keyof typeof typeColors] || color;
      } else if (colorBy === "risk") {
        if (node.riskScore > 70) color = "#ef4444";
        else if (node.riskScore > 40) color = "#f59e0b";
        else color = "#10b981";
      }

      // Draw node
      ctx.fillStyle = color;
      ctx.beginPath();

      // Different shapes for different types
      if (node.type === "wallet") {
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
      } else if (node.type === "exchange") {
        ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
      } else if (node.type === "mixer") {
        // Triangle
        ctx.moveTo(x, y - radius);
        ctx.lineTo(x - radius, y + radius);
        ctx.lineTo(x + radius, y + radius);
        ctx.closePath();
      } else {
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
      }

      ctx.fill();

      // Highlight selected node
      if (selectedNode?.id === node.id) {
        ctx.strokeStyle = "#1d4ed8";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw labels if enabled
      if (showLabels) {
        ctx.fillStyle = "#374151";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(node.label, x, y + radius + 15);
      }
    });
  }, [
    graphData,
    zoomLevel,
    nodeSize,
    edgeThickness,
    colorBy,
    showLabels,
    selectedNode,
  ]);

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = zoomLevel[0] / 100;

    // Find clicked node
    for (const node of graphData.nodes) {
      const nodeX = centerX + node.position.x * scale;
      const nodeY = centerY + node.position.y * scale;
      const radius = nodeSize[0] * (node.type === "wallet" ? 1.5 : 1);

      const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
      if (distance <= radius) {
        setSelectedNode(node);
        return;
      }
    }

    setSelectedNode(null);
  };

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case "wallet":
        return <Circle className="h-4 w-4" />;
      case "exchange":
        return <Square className="h-4 w-4" />;
      case "mixer":
        return <Triangle className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score > 70) return "text-red-600";
    if (score > 40) return "text-orange-600";
    return "text-green-600";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Smart Graph Visualization
          </h1>
          <p className="text-gray-600 mt-2">
            Interactive blockchain transaction network analysis with drag, drop,
            and zoom capabilities
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-4">
              <Input
                placeholder="Enter wallet address to visualize network"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Visualize
              </Button>
            </div>
          </CardContent>
        </Card>

        {graphData && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Graph Area */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <GitBranch className="h-5 w-5 mr-2" />
                      Transaction Network Graph
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Interactive network showing {graphData.nodes.length} nodes
                    and {graphData.edges.length} connections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-96 border rounded-lg cursor-pointer"
                      onClick={handleCanvasClick}
                    />
                    {!graphData && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">
                            Enter a wallet address to generate graph
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Graph Statistics */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Network Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {graphData.statistics.totalNodes}
                      </div>
                      <div className="text-sm text-gray-600">Total Nodes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {graphData.statistics.totalEdges}
                      </div>
                      <div className="text-sm text-gray-600">Connections</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {graphData.statistics.riskDistribution.high || 0}
                      </div>
                      <div className="text-sm text-gray-600">High Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {graphData.statistics.entityTypes.mixer || 0}
                      </div>
                      <div className="text-sm text-gray-600">Mixers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Control Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Zoom Level: {zoomLevel[0]}%</Label>
                    <Slider
                      value={zoomLevel}
                      onValueChange={setZoomLevel}
                      min={25}
                      max={200}
                      step={25}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Node Size: {nodeSize[0]}px</Label>
                    <Slider
                      value={nodeSize}
                      onValueChange={setNodeSize}
                      min={5}
                      max={20}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Edge Thickness: {edgeThickness[0]}px</Label>
                    <Slider
                      value={edgeThickness}
                      onValueChange={setEdgeThickness}
                      min={1}
                      max={5}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="color-by">Color Nodes By</Label>
                    <Select value={colorBy} onValueChange={setColorBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="type">Entity Type</SelectItem>
                        <SelectItem value="risk">Risk Score</SelectItem>
                        <SelectItem value="amount">
                          Transaction Amount
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-labels"
                      checked={showLabels}
                      onCheckedChange={setShowLabels}
                    />
                    <Label htmlFor="show-labels">Show Labels</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Selected Node Details */}
              {selectedNode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Node Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Type</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        {getNodeTypeIcon(selectedNode.type)}
                        <Badge variant="outline" className="capitalize">
                          {selectedNode.type}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label>Address</Label>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                        {selectedNode.id}
                      </div>
                    </div>

                    <div>
                      <Label>Risk Score</Label>
                      <div
                        className={`font-semibold text-lg ${getRiskColor(selectedNode.riskScore)}`}
                      >
                        {selectedNode.riskScore.toFixed(0)}/100
                      </div>
                    </div>

                    {selectedNode.amount && (
                      <div>
                        <Label>Amount</Label>
                        <div className="font-semibold">
                          {selectedNode.amount.toFixed(4)} ETH
                        </div>
                      </div>
                    )}

                    {selectedNode.timestamp && (
                      <div>
                        <Label>Timestamp</Label>
                        <div className="text-sm">
                          {new Date(selectedNode.timestamp).toLocaleString()}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 space-y-2">
                      <Button className="w-full" size="sm">
                        Investigate Node
                      </Button>
                      <Button variant="outline" className="w-full" size="sm">
                        Add to Watchlist
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Legend */}
              <Card>
                <CardHeader>
                  <CardTitle>Legend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Wallet</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Square className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Exchange</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Triangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Mixer</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Entity</span>
                    </div>
                  </div>

                  {colorBy === "risk" && (
                    <div className="pt-3 border-t">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span className="text-sm">Low Risk (0-40)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-orange-500 rounded"></div>
                          <span className="text-sm">Medium Risk (41-70)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <span className="text-sm">High Risk (71-100)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!graphData && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready for Network Analysis
              </h3>
              <p className="text-gray-600 mb-4">
                Enter a wallet address to generate an interactive transaction
                network graph
              </p>
              <div className="text-sm text-gray-500">
                <p>• Drag and drop nodes to rearrange</p>
                <p>• Zoom in/out for detailed analysis</p>
                <p>• Click nodes for detailed information</p>
                <p>• Color coding by risk or entity type</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
