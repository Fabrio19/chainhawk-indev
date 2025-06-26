import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  Download, 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus,
  Eye,
  Trash2
} from "lucide-react";
import { 
  getCaseById, 
  updateCase, 
  uploadEvidence, 
  getEvidence, 
  downloadEvidence, 
  addAction, 
  generateSTR, 
  downloadSTR 
} from "@/services/apiService";
import type { ComplianceCase } from "@/lib/types";

interface CaseDetailProps {
  caseId: string;
  onClose: () => void;
}

interface Evidence {
  id: string;
  file_path: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
}

interface CaseAction {
  id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  details?: any;
}

export function CaseDetail({ caseId, onClose }: CaseDetailProps) {
  const [caseData, setCaseData] = useState<ComplianceCase | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [actions, setActions] = useState<CaseAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newAction, setNewAction] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      setLoading(true);
      const [caseResult, evidenceResult] = await Promise.all([
        getCaseById(caseId),
        getEvidence(caseId)
      ]);
      setCaseData(caseResult);
      setEvidence(evidenceResult);
    } catch (error) {
      console.error("Error loading case data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updatedCase = await updateCase(caseId, { status: newStatus });
      setCaseData(updatedCase);
      
      // Add action log
      await addAction(caseId, {
        action: `Status changed to ${newStatus}`,
        performed_by: "current-user", // TODO: Get from auth context
        details: { previousStatus: caseData?.status, newStatus }
      });
      
      loadCaseData(); // Reload to get updated actions
    } catch (error) {
      console.error("Error updating case status:", error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("description", fileDescription);
      formData.append("uploaded_by", "current-user"); // TODO: Get from auth context

      await uploadEvidence(caseId, formData);
      
      // Reset form
      setSelectedFile(null);
      setFileDescription("");
      
      // Reload evidence
      const evidenceResult = await getEvidence(caseId);
      setEvidence(evidenceResult);
      
      // Add action log
      await addAction(caseId, {
        action: `Evidence uploaded: ${selectedFile.name}`,
        performed_by: "current-user",
        details: { fileName: selectedFile.name, fileType: selectedFile.type }
      });
      
      loadCaseData(); // Reload to get updated actions
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadEvidence = async (evidenceId: string, fileName: string) => {
    try {
      const blob = await downloadEvidence(caseId, evidenceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading evidence:", error);
    }
  };

  const handleGenerateSTR = async () => {
    try {
      await generateSTR(caseId);
      // Add action log
      await addAction(caseId, {
        action: "STR Report generated",
        performed_by: "current-user"
      });
      loadCaseData();
    } catch (error) {
      console.error("Error generating STR:", error);
    }
  };

  const handleDownloadSTR = async () => {
    try {
      const blob = await downloadSTR(caseId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `str_report_${caseId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading STR:", error);
    }
  };

  const handleAddAction = async () => {
    if (!newAction.trim()) return;

    try {
      await addAction(caseId, {
        action: newAction,
        performed_by: "current-user"
      });
      setNewAction("");
      loadCaseData();
    } catch (error) {
      console.error("Error adding action:", error);
    }
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
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return <div>Case not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Case: {caseData.wallet_address}</h2>
          <p className="text-gray-600">Risk Score: {caseData.risk_score}</p>
        </div>
        <Button onClick={onClose} variant="outline">Close</Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="str">STR Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Wallet Address</label>
                  <p className="text-sm text-gray-600">{caseData.wallet_address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Risk Score</label>
                  <p className="text-sm text-gray-600">{caseData.risk_score}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(caseData.status)}
                    <Badge variant={caseData.status === "New" ? "destructive" : "default"}>
                      {caseData.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Assigned To</label>
                  <p className="text-sm text-gray-600">{caseData.assigned_to}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Update Status</label>
                <Select onValueChange={handleStatusChange} value={caseData.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Investigating">Investigating</SelectItem>
                    <SelectItem value="Filed">Filed</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select File</label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe the evidence..."
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                />
              </div>
              <Button onClick={handleFileUpload} disabled={!selectedFile || uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Evidence"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence Files ({evidence.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {evidence.length === 0 ? (
                <p className="text-gray-500">No evidence uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {evidence.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{item.file_path.split('/').pop()}</span>
                        <Badge variant="outline">{item.file_type}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadEvidence(item.id, item.file_path.split('/').pop() || 'file')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add a note or action..."
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
              />
              <Button onClick={handleAddAction} disabled={!newAction.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Action History</CardTitle>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <p className="text-gray-500">No actions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {actions.map((action) => (
                    <div key={action.id} className="p-2 border rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{action.action}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(action.performed_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">by {action.performed_by}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="str" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>STR Report</CardTitle>
              <CardDescription>
                Generate and download Suspicious Transaction Report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={handleGenerateSTR}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate STR
                </Button>
                <Button onClick={handleDownloadSTR} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download STR
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 