const { PrismaClient } = require("@prisma/client");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient(); 

/**
 * Generate new STR report
 * POST /api/str-reports
 */
const generateSTRReport = async (req, res) => {
  try {
    const { 
      reportingPeriod, 
      threshold, 
      suspiciousTransactions,
      reportingEntity,
      complianceOfficer 
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!reportingPeriod || !threshold) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Reporting period and threshold are required",
      });
    }

    // Generate report ID
    const reportId = `STR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    // Mock generated STR report
    const newSTRReport = {
      id: reportId,
      type: "STR",
      reportingPeriod,
      threshold,
      suspiciousTransactions: suspiciousTransactions || Math.floor(Math.random() * 50),
      totalTransactions: Math.floor(Math.random() * 1000),
      status: "draft",
      createdAt: new Date().toISOString(),
      generatedBy: userId,
      reportingEntity: reportingEntity || "ChainHawk Exchange",
      complianceOfficer: complianceOfficer || "John Doe"
    };

    // Generate PDF for the STR report
    const pdfPath = await generateSTRPDF(newSTRReport);
    newSTRReport.pdfPath = pdfPath;

    res.status(201).json(newSTRReport);
  } catch (error) {
    console.error("Error generating STR report:", error);
    res.status(500).json({
      error: "Failed to generate STR report",
      message: error.message,
    });
  }
}; 

/**
 * Generate PDF for an STR report
 */
const generateSTRPDF = async (reportData) => {
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
         .text('SUSPICIOUS TRANSACTION REPORT', { align: 'center' });
      doc.moveDown(0.5);

      // Report ID
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text(`Report ID: ${reportData.id}`, { align: 'center' });
      doc.moveDown(1);

      // Reporting Entity Information
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Reporting Entity Information', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Entity Name: ${reportData.reportingEntity}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Compliance Officer: ${reportData.complianceOfficer}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Report Generated On: ${new Date(reportData.createdAt).toLocaleString()}`);

      doc.moveDown(1);

      // Reporting Period
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Reporting Period', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`From: ${new Date(reportData.reportingPeriod.from).toLocaleDateString()}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`To: ${new Date(reportData.reportingPeriod.to).toLocaleDateString()}`);

      doc.moveDown(1);

      // Transaction Summary
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Transaction Summary', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Total Transactions Monitored: ${reportData.totalTransactions.toLocaleString()}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Suspicious Transactions Identified: ${reportData.suspiciousTransactions.toLocaleString()}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Threshold Amount: ₹${reportData.threshold.toLocaleString()}`);

      doc.moveDown(1);

      // Risk Assessment
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Risk Assessment', { underline: true });
      doc.moveDown(0.5);

      const riskPercentage = (reportData.suspiciousTransactions / reportData.totalTransactions * 100).toFixed(2);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Risk Level: ${getRiskLevel(riskPercentage)}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Suspicious Transaction Rate: ${riskPercentage}%`);

      doc.moveDown(1);

      // Compliance Statement
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Compliance Statement', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text('This report has been prepared in compliance with the Prevention of Money Laundering Act (PMLA), 2002 and the rules and regulations issued thereunder. All suspicious transactions identified during the reporting period have been documented and reported as required by law.');

      doc.moveDown(1);

      // Action Taken
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Action Taken', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text('• Suspicious transactions have been flagged for further investigation');
      doc.fontSize(10)
         .font('Helvetica')
         .text('• Enhanced due diligence has been initiated for affected accounts');
      doc.fontSize(10)
         .font('Helvetica')
         .text('• Internal audit trail has been maintained for all flagged transactions');
      doc.fontSize(10)
         .font('Helvetica')
         .text('• Regulatory authorities have been notified as per compliance requirements');

      doc.moveDown(2);

      // Footer
      doc.fontSize(8)
         .font('Helvetica')
         .text('This report was generated automatically by the ChainHawk Compliance Platform.', { align: 'center' });
      doc.fontSize(8)
         .font('Helvetica')
         .text('This document is confidential and should be handled in accordance with data protection regulations.', { align: 'center' });

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

/**
 * Helper function to get risk level
 */
const getRiskLevel = (percentage) => {
  if (percentage < 1) return 'LOW';
  if (percentage < 5) return 'MEDIUM';
  if (percentage < 10) return 'HIGH';
  return 'CRITICAL';
};

/**
 * Download STR report as PDF
 * GET /api/str-reports/:id/download
 */
const downloadSTRReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if the PDF file exists
    const pdfPath = path.join(__dirname, '../../reports', `${id}.pdf`);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        error: "STR Report not found",
        message: "The requested STR report PDF does not exist",
      });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.pdf"`);
    res.setHeader('Content-Length', fs.statSync(pdfPath).size);

    // Stream the PDF file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming STR PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to download STR report",
          message: "Error occurred while streaming the PDF file",
        });
      }
    });

  } catch (error) {
    console.error("Error downloading STR report:", error);
    res.status(500).json({
      error: "Failed to download STR report",
      message: error.message,
    });
  }
}; 

/**
 * Get all STR reports
 * GET /api/str-reports
 */
const getSTRReports = async (req, res) => {
  try {
    const { type, status, limit = 20 } = req.query;
    const userId = req.user.id;

    // Mock STR reports data
    const mockReports = [
      {
        id: "STR-2024-001",
        type: "STR",
        reportingPeriod: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2024-01-31T23:59:59.999Z"
        },
        threshold: 100000,
        suspiciousTransactions: 15,
        totalTransactions: 1250,
        status: "draft",
        createdAt: "2024-01-15T10:30:00.000Z",
        generatedBy: userId,
        reportingEntity: "ChainHawk Exchange",
        complianceOfficer: "John Doe"
      },
      {
        id: "STR-2024-002",
        type: "STR",
        reportingPeriod: {
          from: "2024-02-01T00:00:00.000Z",
          to: "2024-02-29T23:59:59.999Z"
        },
        threshold: 100000,
        suspiciousTransactions: 8,
        totalTransactions: 980,
        status: "submitted",
        createdAt: "2024-02-15T14:20:00.000Z",
        generatedBy: userId,
        reportingEntity: "ChainHawk Exchange",
        complianceOfficer: "Jane Smith"
      }
    ];

    // Filter reports based on query parameters
    let filteredReports = mockReports;
    
    if (type) {
      filteredReports = filteredReports.filter(report => report.type === type);
    }
    
    if (status) {
      filteredReports = filteredReports.filter(report => report.status === status);
    }

    // Apply limit
    if (limit) {
      filteredReports = filteredReports.slice(0, parseInt(limit));
    }

    res.json({
      reports: filteredReports,
      total: filteredReports.length,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error("Error getting STR reports:", error);
    res.status(500).json({
      error: "Failed to get STR reports",
      message: error.message,
    });
  }
};

/**
 * Get STR report by ID
 * GET /api/str-reports/:id
 */
const getSTRReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Mock STR report data
    const mockReport = {
      id: id,
      type: "STR",
      reportingPeriod: {
        from: "2024-01-01T00:00:00.000Z",
        to: "2024-01-31T23:59:59.999Z"
      },
      threshold: 100000,
      suspiciousTransactions: 15,
      totalTransactions: 1250,
      status: "draft",
      createdAt: "2024-01-15T10:30:00.000Z",
      generatedBy: userId,
      reportingEntity: "ChainHawk Exchange",
      complianceOfficer: "John Doe"
    };

    res.json(mockReport);
  } catch (error) {
    console.error("Error getting STR report:", error);
    res.status(500).json({
      error: "Failed to get STR report",
      message: error.message,
    });
  }
};

/**
 * Update STR report
 * PUT /api/str-reports/:id
 */
const updateSTRReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    // Mock update response
    const updatedReport = {
      id: id,
      ...updateData,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    res.json({
      message: "STR report updated successfully",
      report: updatedReport
    });
  } catch (error) {
    console.error("Error updating STR report:", error);
    res.status(500).json({
      error: "Failed to update STR report",
      message: error.message,
    });
  }
};

/**
 * Delete STR report
 * DELETE /api/str-reports/:id
 */
const deleteSTRReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Mock delete response
    res.json({
      message: "STR report deleted successfully",
      deletedId: id
    });
  } catch (error) {
    console.error("Error deleting STR report:", error);
    res.status(500).json({
      error: "Failed to delete STR report",
      message: error.message,
    });
  }
};

module.exports = {
  generateSTRReport,
  downloadSTRReport,
  getSTRReports,
  getSTRReportById,
  updateSTRReport,
  deleteSTRReport,
}; 