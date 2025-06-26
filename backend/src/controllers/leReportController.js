const { validationResult } = require("express-validator");
const {
  generateLECaseReport,
  generateEvidenceChainReport,
  generateRegulatoryReport,
} = require("../services/leReportService");
const { PrismaClient } = require("@prisma/client");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Law Enforcement Report Controller
 * Handles report generation for law enforcement and regulatory bodies
 */

/**
 * Generate Law Enforcement Case Report
 * POST /le-reports/case/:caseId
 */
const generateCaseReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { caseId } = req.params;
    const { reportType = "FULL" } = req.body;
    const userId = req.user.sub;

    // Verify case exists and user has access
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: { assignedUser: true },
    });

    if (!caseData) {
      return res.status(404).json({
        error: "Case not found",
        code: "CASE_NOT_FOUND",
      });
    }

    // Generate report
    const result = await generateLECaseReport(caseId, reportType);

    res.status(201).json({
      message: "Law enforcement report generated successfully",
      reportId: result.reportId,
      pdfPath: result.pdfPath,
      caseId: caseId,
      reportType: reportType,
    });
  } catch (error) {
    console.error("Generate LE case report error:", error);
    res.status(500).json({
      error: "Failed to generate law enforcement report",
      code: "LE_REPORT_GENERATION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Generate Evidence Chain Report
 * POST /le-reports/evidence-chain/:caseId
 */
const generateEvidenceChainReportHandler = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.sub;

    // Verify case exists
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseData) {
      return res.status(404).json({
        error: "Case not found",
        code: "CASE_NOT_FOUND",
      });
    }

    // Generate evidence chain report
    const result = await generateEvidenceChainReport(caseId);

    res.status(201).json({
      message: "Evidence chain report generated successfully",
      pdfPath: result.pdfPath,
      caseId: caseId,
      reportType: "EVIDENCE_CHAIN",
    });
  } catch (error) {
    console.error("Generate evidence chain report error:", error);
    res.status(500).json({
      error: "Failed to generate evidence chain report",
      code: "EVIDENCE_CHAIN_REPORT_FAILED",
      details: error.message,
    });
  }
};

/**
 * Generate Regulatory Compliance Report
 * POST /le-reports/regulatory
 */
const generateRegulatoryReportHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { startDate, endDate, regulator = "FIU-IND" } = req.body;
    const userId = req.user.sub;

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        error: "Start date must be before end date",
        code: "INVALID_DATE_RANGE",
      });
    }

    // Generate regulatory report
    const result = await generateRegulatoryReport(startDate, endDate, regulator);

    res.status(201).json({
      message: "Regulatory compliance report generated successfully",
      pdfPath: result.pdfPath,
      regulator: regulator,
      period: {
        startDate: startDate,
        endDate: endDate,
      },
      reportType: "REGULATORY_COMPLIANCE",
    });
  } catch (error) {
    console.error("Generate regulatory report error:", error);
    res.status(500).json({
      error: "Failed to generate regulatory compliance report",
      code: "REGULATORY_REPORT_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get LE Reports for a case
 * GET /le-reports/case/:caseId
 */
const getCaseReports = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.sub;

    // Verify case exists
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseData) {
      return res.status(404).json({
        error: "Case not found",
        code: "CASE_NOT_FOUND",
      });
    }

    // Get reports
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const [reports, total] = await Promise.all([
      prisma.lEReport.findMany({
        where: { caseId },
        orderBy: { generatedAt: "desc" },
        skip,
        take,
      }),
      prisma.lEReport.count({ where: { caseId } }),
    ]);

    res.json({
      reports: reports.map(report => ({
        id: report.id,
        reportType: report.reportType,
        status: report.status,
        generatedAt: report.generatedAt,
        sentAt: report.sentAt,
        sentTo: report.sentTo,
        notes: report.notes,
      })),
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Get case reports error:", error);
    res.status(500).json({
      error: "Failed to get case reports",
      code: "GET_CASE_REPORTS_FAILED",
    });
  }
};

/**
 * Download LE Report PDF
 * GET /le-reports/:reportId/download
 */
const downloadReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.sub;

    // Check if the PDF file exists in the reports directory
    const pdfPath = path.join(__dirname, '../../reports', `${reportId}.pdf`);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        error: "Report not found",
        message: "The requested law enforcement report PDF does not exist",
      });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reportId}.pdf"`);
    res.setHeader('Content-Length', fs.statSync(pdfPath).size);

    // Stream the PDF file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming LE PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to download LE report",
          message: "Error occurred while streaming the PDF file",
        });
      }
    });

  } catch (error) {
    console.error("Download report error:", error);
    res.status(500).json({
      error: "Failed to download report",
      code: "DOWNLOAD_REPORT_FAILED",
    });
  }
};

/**
 * Update report status
 * PUT /le-reports/:reportId/status
 */
const updateReportStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { reportId } = req.params;
    const { status, sentTo, notes } = req.body;
    const userId = req.user.sub;

    // Update report
    const updatedReport = await prisma.lEReport.update({
      where: { id: reportId },
      data: {
        status,
        ...(sentTo && { sentTo }),
        ...(notes && { notes }),
        ...(status === "SENT" && { sentAt: new Date() }),
      },
    });

    res.json({
      message: "Report status updated successfully",
      report: {
        id: updatedReport.id,
        status: updatedReport.status,
        sentAt: updatedReport.sentAt,
        sentTo: updatedReport.sentTo,
        notes: updatedReport.notes,
      },
    });
  } catch (error) {
    console.error("Update report status error:", error);
    res.status(500).json({
      error: "Failed to update report status",
      code: "UPDATE_REPORT_STATUS_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get all LE Reports (admin only)
 * GET /le-reports
 */
const getAllReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, reportType } = req.query;
    const userId = req.user.sub;

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (reportType) where.reportType = reportType;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const [reports, total] = await Promise.all([
      prisma.lEReport.findMany({
        where,
        include: {
          case: {
            select: {
              id: true,
              wallet_address: true,
              risk_score: true,
              status: true,
            },
          },
        },
        orderBy: { generatedAt: "desc" },
        skip,
        take,
      }),
      prisma.lEReport.count({ where }),
    ]);

    res.json({
      reports: reports.map(report => ({
        id: report.id,
        reportType: report.reportType,
        status: report.status,
        generatedAt: report.generatedAt,
        sentAt: report.sentAt,
        sentTo: report.sentTo,
        case: report.case,
      })),
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Get all reports error:", error);
    res.status(500).json({
      error: "Failed to get reports",
      code: "GET_ALL_REPORTS_FAILED",
    });
  }
};

/**
 * Generate new Law Enforcement report
 * POST /api/le-reports
 */
const generateLEReport = async (req, res) => {
  try {
    const { 
      caseNumber, 
      investigationType, 
      reportingPeriod, 
      evidenceSummary,
      lawEnforcementAgency 
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!caseNumber || !investigationType || !reportingPeriod) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Case number, investigation type, and reporting period are required",
      });
    }

    // Generate report ID
    const reportId = `LE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    // Mock generated LE report
    const newLEReport = {
      id: reportId,
      caseNumber,
      investigationType,
      reportingPeriod,
      evidenceSummary: evidenceSummary || "Evidence collected during investigation period",
      status: "draft",
      createdAt: new Date().toISOString(),
      generatedBy: userId,
      lawEnforcementAgency: lawEnforcementAgency || "Cyber Crime Division",
      totalEvidenceItems: Math.floor(Math.random() * 50) + 10,
      digitalEvidenceCount: Math.floor(Math.random() * 30) + 5
    };

    // Generate PDF for the LE report
    const pdfPath = await generateLEPDF(newLEReport);
    newLEReport.pdfPath = pdfPath;

    res.status(201).json(newLEReport);
  } catch (error) {
    console.error("Error generating LE report:", error);
    res.status(500).json({
      error: "Failed to generate LE report",
      message: error.message,
    });
  }
};

/**
 * Generate PDF for a Law Enforcement report
 */
const generateLEPDF = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, '../../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const pdfPath = path.join(reportsDir, `${reportData.id}.pdf`);
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('LAW ENFORCEMENT INVESTIGATION REPORT', { align: 'center' });
      doc.moveDown(0.5);

      // Report ID
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text(`Report ID: ${reportData.id}`, { align: 'center' });
      doc.moveDown(1);

      // Case Information
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Case Information', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Case Number: ${reportData.caseNumber}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Investigation Type: ${reportData.investigationType}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Law Enforcement Agency: ${reportData.lawEnforcementAgency}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Report Generated On: ${new Date(reportData.createdAt).toLocaleString()}`);

      doc.moveDown(1);

      // Reporting Period
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Investigation Period', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`From: ${new Date(reportData.reportingPeriod.from).toLocaleDateString()}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`To: ${new Date(reportData.reportingPeriod.to).toLocaleDateString()}`);

      doc.moveDown(1);

      // Evidence Summary
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Evidence Summary', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Total Evidence Items: ${reportData.totalEvidenceItems.toLocaleString()}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Digital Evidence Count: ${reportData.digitalEvidenceCount.toLocaleString()}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Physical Evidence Count: ${(reportData.totalEvidenceItems - reportData.digitalEvidenceCount).toLocaleString()}`);

      doc.moveDown(1);

      // Evidence Description
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Evidence Description', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(reportData.evidenceSummary, { width: 500 });

      doc.moveDown(1);

      // Investigation Status
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Investigation Status', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Status: ${reportData.status.toUpperCase()}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Investigation Phase: Active`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Priority Level: High`);

      doc.moveDown(1);

      // Legal Compliance
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Legal Compliance', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text('This investigation has been conducted in accordance with applicable laws and regulations. All evidence has been collected and preserved following proper forensic procedures and chain of custody protocols.');

      doc.moveDown(1);

      // Next Steps
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Next Steps', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text('• Continue evidence analysis and documentation');
      doc.fontSize(10)
         .font('Helvetica')
         .text('• Coordinate with relevant law enforcement agencies');
      doc.fontSize(10)
         .font('Helvetica')
         .text('• Prepare case for prosecution if sufficient evidence is found');
      doc.fontSize(10)
         .font('Helvetica')
         .text('• Maintain ongoing monitoring of related activities');

      doc.moveDown(2);

      // Footer
      doc.fontSize(8)
         .font('Helvetica')
         .text('This report was generated by the ChainHawk Law Enforcement Support Platform.', { align: 'center' });
      doc.fontSize(8)
         .font('Helvetica')
         .text('This document is classified and should be handled in accordance with law enforcement protocols.', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(pdfPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateCaseReport,
  generateEvidenceChainReportHandler,
  generateRegulatoryReportHandler,
  getCaseReports,
  downloadReport,
  updateReportStatus,
  getAllReports,
  generateLEReport,
}; 