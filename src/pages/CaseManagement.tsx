import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CaseDetail } from "@/components/CaseDetail";
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
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCases, createCase } from "@/services/apiService";
import type { ComplianceCase } from "@/lib/types";
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MessageSquare,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  FileText,
} from "lucide-react";

export default function CaseManagement() {
  const [cases, setCases] = useState<ComplianceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);
  const [showCaseDetail, setShowCaseDetail] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // New case form state
  const [newCase, setNewCase] = useState({
    wallet_address: "",
    related_tx_hash: "",
    risk_score: 50,
    assigned_to: "",
  });

  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true);
        const casesData = await getCases();
        // Ensure casesData is always an array
        const safeCasesData = Array.isArray(casesData) ? casesData : [];
        setCases(safeCasesData);

        if (safeCasesData.length === 0) {
          console.warn("No cases data received, check backend connection");
        }
      } catch (error) {
        console.error("Error loading cases:", error);
        setCases([]); // Set empty array on error
        // You could add a toast notification here
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, []);

  const handleCreateCase = async () => {
    try {
      console.log("Creating case with data:", newCase);
      const createdCase = await createCase(newCase);
      console.log("Case created successfully:", createdCase);
      setCases([...cases, createdCase]);
      setShowCreateDialog(false);
      setNewCase({
        wallet_address: "",
        related_tx_hash: "",
        risk_score: 50,
        assigned_to: "",
      });
    } catch (error) {
      console.error("Error creating case:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "New":
        return <Badge variant="destructive">New</Badge>;
      case "Investigating":
        return <Badge variant="default">Investigating</Badge>;
      case "Filed":
        return <Badge variant="secondary">Filed</Badge>;
      case "Closed":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredCases = Array.isArray(cases)
    ? cases.filter((case_) => {
        const matchesSearch =
          case_.wallet_address
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (case_.related_tx_hash &&
            case_.related_tx_hash
              .toLowerCase()
              .includes(searchTerm.toLowerCase()));

        const matchesStatus =
          filterStatus === "all" || case_.status === filterStatus;

        return matchesSearch && matchesStatus;
      })
    : [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "investigating":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "closed":
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <FolderOpen className="h-4 w-4 text-gray-500" />;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Case Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage compliance investigations and track case progress
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Case</DialogTitle>
                <DialogDescription>
                  Start a new compliance investigation case
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Case title" />
                <Textarea placeholder="Case description" rows={4} />
                <div className="grid grid-cols-2 gap-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Assigned to" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analyst1">Analyst 1</SelectItem>
                      <SelectItem value="analyst2">Analyst 2</SelectItem>
                      <SelectItem value="analyst3">Analyst 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Related wallet addresses (comma separated)" />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Create Case</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold">
                    {Array.isArray(cases)
                      ? cases.filter((c) => c.status === "New").length
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">New Cases</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold">
                    {Array.isArray(cases)
                      ? cases.filter((c) => c.status === "Investigating").length
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Investigating</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold">
                    {Array.isArray(cases)
                      ? cases.filter((c) => c.status === "Filed").length
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Filed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-gray-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold">
                    {Array.isArray(cases)
                      ? cases.filter((c) => c.status === "Closed").length
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Closed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search cases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Investigating">Investigating</SelectItem>
                  <SelectItem value="Filed">Filed</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cases Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cases ({filteredCases.length})</CardTitle>
            <CardDescription>
              All compliance investigation cases and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((case_) => (
                  <TableRow key={case_.id}>
                    <TableCell className="font-mono text-sm">
                      {case_.id}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {case_.wallet_address.slice(0, 8)}...
                      {case_.wallet_address.slice(-6)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          case_.risk_score > 70
                            ? "destructive"
                            : case_.risk_score > 40
                              ? "default"
                              : "secondary"
                        }
                      >
                        {case_.risk_score}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(case_.status)}
                        {getStatusBadge(case_.status)}
                      </div>
                    </TableCell>
                    <TableCell>{case_.assigned_to}</TableCell>
                    <TableCell>
                      {new Date(case_.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCase(case_);
                          setShowCaseDetail(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
