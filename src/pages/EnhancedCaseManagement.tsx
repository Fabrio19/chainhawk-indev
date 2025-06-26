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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCases, getCaseNotes } from "@/services/apiService";
import type { ComplianceCase, CaseNote } from "@/lib/types";
import {
  FolderOpen,
  Plus,
  MessageSquare,
  Paperclip,
  Upload,
  Download,
  Eye,
  Edit,
  Clock,
  User,
  FileText,
  Image,
  AlertTriangle,
  CheckCircle,
  Send,
} from "lucide-react";

export default function EnhancedCaseManagement() {
  const [cases, setCases] = useState<ComplianceCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const casesData = await getCases();
        setCases(casesData);
      } catch (error) {
        console.error("Error loading cases:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      loadCaseNotes(selectedCase.id);
    }
  }, [selectedCase]);

  const loadCaseNotes = async (caseId: string) => {
    try {
      const notes = await getCaseNotes(caseId);
      setCaseNotes(notes);
    } catch (error) {
      console.error("Error loading case notes:", error);
    }
  };

  const addNote = () => {
    if (!newNote.trim() || !selectedCase) return;

    const note: CaseNote = {
      id: `NOTE-${Date.now()}`,
      caseId: selectedCase.id,
      authorId: "current-user",
      authorName: "Current User",
      content: newNote,
      type: "text",
      isPrivate: false,
      timestamp: new Date().toISOString(),
      attachments: [],
      mentions: [],
      tags: [],
    };

    setCaseNotes([...caseNotes, note]);
    setNewNote("");
  };

  const getAttachmentIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "New":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "Investigating":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "Filed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Closed":
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <FolderOpen className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case "analysis":
        return <Eye className="h-4 w-4 text-blue-500" />;
      case "decision":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "escalation":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
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
              Enhanced Case Management
            </h1>
            <p className="text-gray-600 mt-2">
              Advanced case management with notes, attachments, and
              collaboration features for regulatory compliance
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
                <DialogTitle>Create New Compliance Case</DialogTitle>
                <DialogDescription>
                  Start a new investigation case with full documentation support
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
                      <SelectItem value="analyst1">Senior Analyst</SelectItem>
                      <SelectItem value="analyst2">
                        Compliance Officer
                      </SelectItem>
                      <SelectItem value="analyst3">
                        Investigation Team
                      </SelectItem>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cases List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Active Cases</CardTitle>
                <CardDescription>
                  Click on a case to view details and add notes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cases.slice(0, 8).map((case_) => (
                    <div
                      key={case_.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCase?.id === case_.id
                          ? "bg-blue-50 border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedCase(case_)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(case_.status)}
                          <span className="font-medium text-sm">
                            {case_.id}
                          </span>
                        </div>
                        <Badge
                          variant={
                            case_.risk_score > 80
                              ? "destructive"
                              : case_.risk_score > 60
                                ? "destructive"
                                : "default"
                          }
                          className="text-xs"
                        >
                          Risk: {case_.risk_score}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm mb-1">
                        {case_.wallet_address}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        Status: {case_.status} • Risk Score: {case_.risk_score}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{case_.assigned_to}</span>
                        <span>
                          {new Date(case_.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Case Details */}
          <div className="lg:col-span-2">
            {selectedCase ? (
              <div className="space-y-6">
                {/* Case Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          {getStatusIcon(selectedCase.status)}
                          <span>Case: {selectedCase.wallet_address}</span>
                          <Badge
                            variant={
                              selectedCase.risk_score > 80
                                ? "destructive"
                                : selectedCase.risk_score > 60
                                  ? "destructive"
                                  : "default"
                            }
                          >
                            Risk: {selectedCase.risk_score}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {selectedCase.id} • Created{" "}
                          {new Date(
                            selectedCase.created_at,
                          ).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-600">Status:</span>
                        <div className="font-medium capitalize">
                          {selectedCase.status}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">
                          Assigned to:
                        </span>
                        <div className="font-medium">
                          {selectedCase.assigned_to}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-4">
                      Wallet Address: {selectedCase.wallet_address}
                    </p>
                    <div>
                      <span className="text-sm text-gray-600">
                        Related Transaction:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCase.related_tx_hash && (
                          <Badge
                            variant="outline"
                            className="font-mono"
                          >
                            {selectedCase.related_tx_hash.slice(0, 8)}...{selectedCase.related_tx_hash.slice(-6)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Case Content Tabs */}
                <Tabs defaultValue="notes" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="notes">
                      Notes ({caseNotes.length})
                    </TabsTrigger>
                    <TabsTrigger value="attachments">Attachments</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="findings">Findings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="notes" className="space-y-4">
                    {/* Add Note */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add Note
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Add a note to this case..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            rows={3}
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Paperclip className="h-4 w-4 mr-1" />
                                Attach File
                              </Button>
                              <Select>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Note</SelectItem>
                                  <SelectItem value="analysis">
                                    Analysis
                                  </SelectItem>
                                  <SelectItem value="decision">
                                    Decision
                                  </SelectItem>
                                  <SelectItem value="escalation">
                                    Escalation
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={addNote}
                              disabled={!newNote.trim()}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Add Note
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Notes List */}
                    <div className="space-y-4">
                      {caseNotes
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime(),
                        )
                        .map((note) => (
                          <Card key={note.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {note.authorName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-sm">
                                        {note.authorName}
                                      </span>
                                      {getNoteTypeIcon(note.type)}
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {note.type}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {new Date(
                                        note.timestamp,
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-2">
                                    {note.content}
                                  </p>
                                  {note.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {note.attachments.map((attachment) => (
                                        <div
                                          key={attachment.id}
                                          className="flex items-center space-x-1 text-xs bg-gray-100 px-2 py-1 rounded"
                                        >
                                          {getAttachmentIcon(
                                            attachment.fileType,
                                          )}
                                          <span>{attachment.fileName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {note.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {note.tags.map((tag, i) => (
                                        <Badge
                                          key={i}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          #{tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="attachments" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center">
                            <Paperclip className="h-4 w-4 mr-2" />
                            Case Attachments
                          </span>
                          <Button>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Files
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            "Transaction_Evidence.xlsx",
                            "Wallet_Analysis.pdf",
                            "Screenshot_001.png",
                            "Compliance_Report.docx",
                          ].map((fileName, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                {getAttachmentIcon(fileName.split(".")[1])}
                                <div>
                                  <div className="font-medium text-sm">
                                    {fileName}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {Math.floor(Math.random() * 5000 + 1000)} KB
                                    • {new Date().toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Case Activity Timeline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            {
                              action: "Case Created",
                              user: "System",
                              time: selectedCase.created_at,
                              icon: <FolderOpen className="h-4 w-4" />,
                            },
                            {
                              action: "Assigned to Analyst",
                              user: "Supervisor",
                              time: selectedCase.created_at,
                              icon: <User className="h-4 w-4" />,
                            },
                            {
                              action: "Investigation Started",
                              user: selectedCase.assigned_to,
                              time: selectedCase.created_at,
                              icon: <Eye className="h-4 w-4" />,
                            },
                          ].map((activity, i) => (
                            <div key={i} className="flex items-start space-x-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                {activity.icon}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {activity.action}
                                </div>
                                <div className="text-xs text-gray-600">
                                  by {activity.user} •{" "}
                                  {new Date(activity.time).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="findings" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Investigation Findings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[
                            "Wallet address shows high-risk transaction patterns",
                            "Multiple connections to sanctioned entities detected",
                            "Unusual transaction volume compared to historical data",
                            "Geographic risk indicators present"
                          ].map((finding, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                <span className="text-sm">{finding}</span>
                              </div>
                            </div>
                          ))}
                          <Button variant="outline" className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Finding
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
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a Case
                  </h3>
                  <p className="text-gray-600">
                    Choose a case from the list to view details, add notes, and
                    manage attachments
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
