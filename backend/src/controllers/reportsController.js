const { PrismaClient } = require("@prisma/client");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Get all regulatory reports
 * GET /api/reports
 */
const getReports = async (req, res) => {
  try {
    const { type, status, limit = 50 } = req.query;
    const userId = req.user.id;

    // Mock reports data (in production, this would come from database)
    const mockReports = [
      {
        id: "STR-2024-001",
        type: "STR",
        regulatorCode: "FIU-IND",
        reportingPeriod: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2024-01-31T23:59:59.999Z",
        },
        totalTransactions: 1250,
        suspiciousTransactions: 15,
        status: "submitted",
        createdAt: "2024-01-31T10:00:00.000Z",
        submittedAt: "2024-02-01T09:30:00.000Z",
      },
      {
        id: "CTR-2024-002",
        type: "CTR",
        regulatorCode: "RBI",
        reportingPeriod: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2024-01-31T23:59:59.999Z",
        },
        totalTransactions: 8900,
        suspiciousTransactions: 0,
        status: "accepted",
        createdAt: "2024-01-31T14:00:00.000Z",
        submittedAt: "2024-02-01T10:15:00.000Z",
        acceptedAt: "2024-02-02T11:20:00.000Z",
      },
      {
        id: "SAR-2024-003",
        type: "SAR",
        regulatorCode: "SEBI",
        reportingPeriod: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2024-01-31T23:59:59.999Z",
        },
        totalTransactions: 3400,
        suspiciousTransactions: 8,
        status: "draft",
        createdAt: "2024-01-31T16:00:00.000Z",
      },
      {
        id: "STR-2024-004",
        type: "STR",
        regulatorCode: "FIU-IND",
        reportingPeriod: {
          from: "2024-02-01T00:00:00.000Z",
          to: "2024-02-29T23:59:59.999Z",
        },
        totalTransactions: 2100,
        suspiciousTransactions: 22,
        status: "rejected",
        createdAt: "2024-02-29T12:00:00.000Z",
        submittedAt: "2024-03-01T09:00:00.000Z",
        rejectedAt: "2024-03-02T14:30:00.000Z",
        rejectionReason: "Incomplete transaction details",
      },
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
    filteredReports = filteredReports.slice(0, parseInt(limit));

    res.json(filteredReports);
  } catch (error) {
    console.error("Error getting reports:", error);
    res.status(500).json({
      error: "Failed to get reports",
      message: error.message,
    });
  }
};

/**
 * Get report by ID
 * GET /api/reports/:id
 */
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Mock report data (in production, this would come from database)
    const mockReport = {
      id: id,
      type: "STR",
      regulatorCode: "FIU-IND",
      reportingPeriod: {
        from: "2024-01-01T00:00:00.000Z",
        to: "2024-01-31T23:59:59.999Z",
      },
      totalTransactions: 1250,
      suspiciousTransactions: 15,
      status: "submitted",
      createdAt: "2024-01-31T10:00:00.000Z",
      submittedAt: "2024-02-01T09:30:00.000Z",
      details: {
        transactions: [
          {
            id: "tx-001",
            hash: "0x1234567890abcdef...",
            amount: 50000,
            currency: "INR",
            from: "0xabc123...",
            to: "0xdef456...",
            timestamp: "2024-01-15T10:30:00.000Z",
            riskScore: 85,
            flags: ["high-value", "unusual-pattern"],
          },
        ],
        summary: {
          totalVolume: 750000,
          averageTransactionSize: 50000,
          riskDistribution: {
            low: 5,
            medium: 7,
            high: 3,
          },
        },
      },
    };

    res.json(mockReport);
  } catch (error) {
    console.error("Error getting report:", error);
    res.status(500).json({
      error: "Failed to get report",
      message: error.message,
    });
  }
};

/**
 * Generate new report
 * POST /api/reports
 */
const generateReport = async (req, res) => {
  try {
    const { type, regulatorCode, reportingPeriod, threshold } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!type || !regulatorCode || !reportingPeriod) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Type, regulator code, and reporting period are required",
      });
    }

    // Generate report ID
    const reportId = `${type}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    // Mock generated report
    const newReport = {
      id: reportId,
      type,
      regulatorCode,
      reportingPeriod,
      totalTransactions: Math.floor(Math.random() * 10000),
      suspiciousTransactions: Math.floor(Math.random() * 100),
      status: "draft",
      createdAt: new Date().toISOString(),
      generatedBy: userId,
    };

    // Generate PDF for the report
    const pdfPath = await generatePDF(newReport);
    newReport.pdfPath = pdfPath;

    res.status(201).json(newReport);
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({
      error: "Failed to generate report",
      message: error.message,
    });
  }
};

/**
 * Download report as PDF
 * GET /api/reports/:id/download
 */
const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // In a real application, you would fetch the report from database
    // For now, we'll check if the PDF file exists
    const pdfPath = path.join(__dirname, '../../reports', `${id}.pdf`);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        error: "Report not found",
        message: "The requested report PDF does not exist",
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
      console.error('Error streaming PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to download report",
          message: "Error occurred while streaming the PDF file",
        });
      }
    });

  } catch (error) {
    console.error("Error downloading report:", error);
    res.status(500).json({
      error: "Failed to download report",
      message: error.message,
    });
  }
};

/**
 * Prepare report template
 * POST /api/reports/prepare
 */
const prepareReport = async (req, res) => {
  try {
    const { reportType, regulatorCode, deadlineType } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!reportType || !regulatorCode) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Report type and regulator code are required",
      });
    }

    // Get current date for calculations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    // Calculate reporting period based on deadline type
    let reportingPeriod = {};
    let threshold = 1000000; // Default 10 Lakh INR

    switch (deadlineType) {
      case 'monthly':
        // Monthly reports: 1st to last day of previous month
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        reportingPeriod = {
          from: firstDayOfMonth.toISOString(),
          to: lastDayOfMonth.toISOString()
        };
        break;
      
      case 'quarterly':
        // Quarterly reports: 3-month period ending last quarter
        const quarter = Math.floor(currentMonth / 3);
        const quarterStartMonth = quarter * 3;
        const quarterEndMonth = quarterStartMonth + 2;
        const quarterStart = new Date(currentYear, quarterStartMonth, 1);
        const quarterEnd = new Date(currentYear, quarterEndMonth + 1, 0);
        reportingPeriod = {
          from: quarterStart.toISOString(),
          to: quarterEnd.toISOString()
        };
        break;
      
      case 'annual':
        // Annual reports: Full year
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        reportingPeriod = {
          from: yearStart.toISOString(),
          to: yearEnd.toISOString()
        };
        break;
      
      default:
        // Default to current month
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);
        reportingPeriod = {
          from: monthStart.toISOString(),
          to: monthEnd.toISOString()
        };
    }

    // Set thresholds based on report type and regulator
    switch (reportType) {
      case 'STR':
        threshold = 1000000; // 10 Lakh for STR
        break;
      case 'CTR':
        threshold = 2000000; // 20 Lakh for CTR
        break;
      case 'SAR':
        threshold = 500000; // 5 Lakh for SAR
        break;
    }

    // Prepare template data
    const templateData = {
      type: reportType,
      regulatorCode: regulatorCode,
      reportingPeriod: reportingPeriod,
      threshold: threshold,
      deadline: deadlineType,
      estimatedTransactions: Math.floor(Math.random() * 5000) + 1000,
      estimatedSuspiciousTransactions: Math.floor(Math.random() * 100) + 10,
      template: {
        description: `Pre-filled ${reportType} report for ${regulatorCode}`,
        autoGenerated: true,
        deadlineType: deadlineType
      }
    };

    res.json(templateData);
  } catch (error) {
    console.error("Error preparing report:", error);
    res.status(500).json({
      error: "Failed to prepare report",
      message: error.message,
    });
  }
};

/**
 * Generate PDF for a report
 */
const generatePDF = async (reportData) => {
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
         .text('Regulatory Compliance Report', { align: 'center' });
      doc.moveDown(0.5);

      // Report ID
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text(`Report ID: ${reportData.id}`, { align: 'center' });
      doc.moveDown(1);

      // Report Details
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Report Details', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Report Type: ${reportData.type}`, { continued: true })
         .font('Helvetica-Bold')
         .text(` (${getReportTypeFullName(reportData.type)})`);
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Regulator: ${reportData.regulatorCode}`, { continued: true })
         .font('Helvetica-Bold')
         .text(` (${getRegulatorFullName(reportData.regulatorCode)})`);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Status: ${reportData.status.toUpperCase()}`);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Generated On: ${new Date(reportData.createdAt).toLocaleString()}`);

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
         .text(`Total Transactions: ${reportData.totalTransactions.toLocaleString()}`);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Suspicious Transactions: ${reportData.suspiciousTransactions.toLocaleString()}`);

      if (reportData.threshold) {
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Threshold Amount: ₹${reportData.threshold.toLocaleString()}`);
      }

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

      doc.moveDown(2);

      // Footer
      doc.fontSize(8)
         .font('Helvetica')
         .text('This report was generated automatically by the ChainHawk Compliance Platform.', { align: 'center' });
      doc.fontSize(8)
         .font('Helvetica')
         .text('For questions or concerns, please contact your compliance officer.', { align: 'center' });

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
 * Helper function to get full report type name
 */
const getReportTypeFullName = (type) => {
  const types = {
    'STR': 'Suspicious Transaction Report',
    'CTR': 'Cash Transaction Report',
    'SAR': 'Suspicious Activity Report'
  };
  return types[type] || type;
};

/**
 * Helper function to get full regulator name
 */
const getRegulatorFullName = (code) => {
  const regulators = {
    'FIU-IND': 'Financial Intelligence Unit - India',
    'SEBI': 'Securities and Exchange Board of India',
    'RBI': 'Reserve Bank of India'
  };
  return regulators[code] || code;
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

module.exports = {
  getReports,
  getReportById,
  generateReport,
  downloadReport,
  prepareReport,
}; 