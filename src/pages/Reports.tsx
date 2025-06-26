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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRegulatoryReports, generateRegulatoryReport, prepareRegulatoryReport } from "@/services/apiService";
import type { RegulatoryReport } from "@/lib/types";
import {
  FileText,
  Plus,
  Download,
  Eye,
  Calendar,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
} from "lucide-react";

export default function Reports() {
  const [reports, setReports] = useState<RegulatoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preparing, setPreparing] = useState(false);
  
  // Report generation form state
  const [reportForm, setReportForm] = useState({
    type: "",
    regulatorCode: "",
    reportingPeriod: {
      from: "",
      to: ""
    },
    threshold: ""
  });

  useEffect(() => {
    const loadReports = async () => {
      try {
        const reportsData = await getRegulatoryReports();
        setReports(reportsData);
      } catch (error) {
        console.error("Error loading reports:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      
      // Validate required fields
      if (!reportForm.type || !reportForm.regulatorCode || !reportForm.reportingPeriod.from || !reportForm.reportingPeriod.to) {
        alert("Please fill in all required fields");
        return;
      }

      const reportData = {
        type: reportForm.type,
        regulatorCode: reportForm.regulatorCode,
        reportingPeriod: {
          from: new Date(reportForm.reportingPeriod.from).toISOString(),
          to: new Date(reportForm.reportingPeriod.to).toISOString()
        },
        threshold: reportForm.threshold ? parseInt(reportForm.threshold) : undefined
      };

      const newReport = await generateRegulatoryReport(reportData);
      
      // Add the new report to the list
      setReports([newReport, ...reports]);
      
      // Reset form and close dialog
      setReportForm({
        type: "",
        regulatorCode: "",
        reportingPeriod: { from: "", to: "" },
        threshold: ""
      });
      setShowGenerateDialog(false);
      
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrepareReport = async (reportType: string, regulatorCode: string, deadlineType: string) => {
    try {
      setPreparing(true);
      
      const prepareData = {
        reportType,
        regulatorCode,
        deadlineType
      };

      const templateData = await prepareRegulatoryReport(prepareData);
      
      // Pre-fill the form with template data
      setReportForm({
        type: templateData.type,
        regulatorCode: templateData.regulatorCode,
        reportingPeriod: {
          from: new Date(templateData.reportingPeriod.from).toISOString().split('T')[0],
          to: new Date(templateData.reportingPeriod.to).toISOString().split('T')[0]
        },
        threshold: templateData.threshold.toString()
      });
      
      // Open the generate dialog with pre-filled data
      setShowGenerateDialog(true);
      
    } catch (error) {
      console.error("Error preparing report:", error);
      alert("Failed to prepare report. Please try again.");
    } finally {
      setPreparing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "submitted":
        return <Badge variant="default">Submitted</Badge>;
      case "accepted":
        return <Badge variant="secondary">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <Clock className="h-4 w-4 text-gray-500" />;
      case "submitted":
        return <Send className="h-4 w-4 text-blue-500" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRegulatorBadge = (regulator: string) => {
    const colors = {
      "FIU-IND": "bg-blue-100 text-blue-800",
      SEBI: "bg-green-100 text-green-800",
      RBI: "bg-purple-100 text-purple-800",
    };
    return (
      <Badge
        variant="outline"
        className={colors[regulator as keyof typeof colors] || ""}
      >
        {regulator}
      </Badge>
    );
  };

  const getReportTypeBadge = (type: string) => {
    const colors = {
      STR: "bg-red-100 text-red-800",
      CTR: "bg-orange-100 text-orange-800",
      SAR: "bg-yellow-100 text-yellow-800",
    };
    return (
      <Badge
        variant="outline"
        className={colors[type as keyof typeof colors] || ""}
      >
        {type}
      </Badge>
    );
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
              Regulatory Reports
            </h1>
            <p className="text-gray-600 mt-2">
              Generate and manage STR, CTR, and SAR reports for FIU-IND, SEBI,
              and RBI
            </p>
          </div>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowGenerateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate New Report</DialogTitle>
                <DialogDescription>
                  Create a new regulatory compliance report
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select value={reportForm.type} onValueChange={(value) => setReportForm({...reportForm, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Report Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STR">
                        STR - Suspicious Transaction Report
                      </SelectItem>
                      <SelectItem value="CTR">
                        CTR - Cash Transaction Report
                      </SelectItem>
                      <SelectItem value="SAR">
                        SAR - Suspicious Activity Report
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={reportForm.regulatorCode} onValueChange={(value) => setReportForm({...reportForm, regulatorCode: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Regulator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIU-IND">
                        FIU-IND (Financial Intelligence Unit)
                      </SelectItem>
                      <SelectItem value="SEBI">
                        SEBI (Securities Exchange Board)
                      </SelectItem>
                      <SelectItem value="RBI">
                        RBI (Reserve Bank of India)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">From Date</label>
                    <Input 
                      type="date" 
                      value={reportForm.reportingPeriod.from}
                      onChange={(e) => setReportForm({
                        ...reportForm, 
                        reportingPeriod: {...reportForm.reportingPeriod, from: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To Date</label>
                    <Input 
                      type="date" 
                      value={reportForm.reportingPeriod.to}
                      onChange={(e) => setReportForm({
                        ...reportForm, 
                        reportingPeriod: {...reportForm.reportingPeriod, to: e.target.value}
                      })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Transaction Threshold (INR)
                  </label>
                  <Input 
                    placeholder="e.g., 1000000 for ₹10 Lakh" 
                    value={reportForm.threshold}
                    onChange={(e) => setReportForm({...reportForm, threshold: e.target.value})}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowGenerateDialog(false)}
                    disabled={generating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerateReport}
                    disabled={generating}
                  >
                    {generating ? "Generating..." : "Generate Report"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {reports.filter((r) => r.status === "draft").length}
                  </div>
                  <div className="text-sm text-gray-600">Draft Reports</div>
                </div>
                <Clock className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {reports.filter((r) => r.status === "submitted").length}
                  </div>
                  <div className="text-sm text-gray-600">Submitted</div>
                </div>
                <Send className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {reports.filter((r) => r.type === "STR").length}
                  </div>
                  <div className="text-sm text-gray-600">STR Reports</div>
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
                    {reports.filter((r) => r.status === "accepted").length}
                  </div>
                  <div className="text-sm text-gray-600">Accepted</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Table */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Reports</TabsTrigger>
            <TabsTrigger value="STR">STR</TabsTrigger>
            <TabsTrigger value="CTR">CTR</TabsTrigger>
            <TabsTrigger value="SAR">SAR</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Regulatory Reports</CardTitle>
                <CardDescription>
                  Complete list of generated compliance reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Regulator</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono text-sm">
                          {report.id}
                        </TableCell>
                        <TableCell>{getReportTypeBadge(report.type)}</TableCell>
                        <TableCell>
                          {getRegulatorBadge(report.regulatorCode)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(
                            report.reportingPeriod.from,
                          ).toLocaleDateString()}{" "}
                          -{" "}
                          {new Date(
                            report.reportingPeriod.to,
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              Total: {report.totalTransactions.toLocaleString()}
                            </div>
                            <div className="text-red-600">
                              Suspicious:{" "}
                              {report.suspiciousTransactions.toLocaleString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(report.status)}
                            {getStatusBadge(report.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                            {report.status === "draft" && (
                              <Button size="sm">Submit</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="STR" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                  Suspicious Transaction Reports (STR)
                </CardTitle>
                <CardDescription>
                  Reports for transactions flagged as suspicious under FIU-IND
                  guidelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports
                    .filter((r) => r.type === "STR")
                    .map((report) => (
                      <div
                        key={report.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="font-semibold">{report.id}</h3>
                              <p className="text-sm text-gray-600">
                                {getRegulatorBadge(report.regulatorCode)} •{" "}
                                {new Date(
                                  report.reportingPeriod.from,
                                ).toLocaleDateString()}{" "}
                                to{" "}
                                {new Date(
                                  report.reportingPeriod.to,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(report.status)}
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">
                              Suspicious Transactions:
                            </span>
                            <div className="font-semibold text-red-600">
                              {report.suspiciousTransactions}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Total Transactions:
                            </span>
                            <div className="font-semibold">
                              {report.totalTransactions.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Submission Date:
                            </span>
                            <div className="font-semibold">
                              {report.submissionDate
                                ? new Date(
                                    report.submissionDate,
                                  ).toLocaleDateString()
                                : "Not submitted"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="CTR" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-orange-500" />
                  Cash Transaction Reports (CTR)
                </CardTitle>
                <CardDescription>
                  Reports for cash transactions above regulatory thresholds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports
                    .filter((r) => r.type === "CTR")
                    .map((report) => (
                      <div
                        key={report.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{report.id}</h3>
                            <p className="text-sm text-gray-600">
                              Cash transactions above ₹10 Lakh threshold
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(report.status)}
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="SAR" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-yellow-600" />
                  Suspicious Activity Reports (SAR)
                </CardTitle>
                <CardDescription>
                  Reports for suspicious patterns and activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports
                    .filter((r) => r.type === "SAR")
                    .map((report) => (
                      <div
                        key={report.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{report.id}</h3>
                            <p className="text-sm text-gray-600">
                              Behavioral pattern analysis report
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(report.status)}
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Report Templates</CardTitle>
                <CardDescription>
                  Pre-configured templates for different types of regulatory
                  reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">FIU-IND STR Template</h3>
                      <Badge variant="outline">STR</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Standard template for suspicious transaction reporting to
                      Financial Intelligence Unit
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handlePrepareReport("STR", "FIU-IND", "monthly")}
                      disabled={preparing}
                    >
                      {preparing ? "Preparing..." : "Use Template"}
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">RBI CTR Template</h3>
                      <Badge variant="outline">CTR</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Cash transaction reporting template for Reserve Bank of
                      India compliance
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handlePrepareReport("CTR", "RBI", "quarterly")}
                      disabled={preparing}
                    >
                      {preparing ? "Preparing..." : "Use Template"}
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">SEBI SAR Template</h3>
                      <Badge variant="outline">SAR</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Suspicious activity reporting for Securities Exchange
                      Board regulations
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handlePrepareReport("SAR", "SEBI", "annual")}
                      disabled={preparing}
                    >
                      {preparing ? "Preparing..." : "Use Template"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Compliance Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>
              Important regulatory reporting deadlines and requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="font-semibold text-red-800">
                    Monthly STR Submission
                  </div>
                  <div className="text-sm text-red-600">
                    FIU-IND deadline: 15th of each month
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-red-800">
                    5 days remaining
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handlePrepareReport("STR", "FIU-IND", "monthly")}
                    disabled={preparing}
                  >
                    {preparing ? "Preparing..." : "Prepare Report"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <div className="font-semibold text-orange-800">
                    Quarterly CTR Review
                  </div>
                  <div className="text-sm text-orange-600">
                    RBI quarterly compliance review
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-orange-800">
                    12 days remaining
                  </div>
                  <Button variant="outline" size="sm">
                    Schedule Review
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-semibold text-blue-800">
                    Annual Compliance Audit
                  </div>
                  <div className="text-sm text-blue-600">
                    SEBI annual audit requirement
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-800">
                    45 days remaining
                  </div>
                  <Button variant="outline" size="sm">
                    View Requirements
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
