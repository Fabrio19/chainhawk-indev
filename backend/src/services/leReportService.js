const { PrismaClient } = require("@prisma/client");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

/**
 * Law Enforcement Report Service
 * Generates comprehensive reports for law enforcement and regulatory bodies
 */

/**
 * Generate Law Enforcement Case Report
 */
const generateLECaseReport = async (caseId, reportType = "FULL") => {
  try {
    // Fetch case with all related data
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        assignedUser: true,
        evidence: true,
        actions: {
          include: {
            performer: true,
          },
          orderBy: { performed_at: "asc" },
        },
      },
    });

    if (!caseData) {
      throw new Error("Case not found");
    }

    // Fetch related audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        endpoint: {
          contains: caseId,
        },
      },
      include: {
        user: true,
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    // Fetch sanctions data if available
    const sanctionsData = await prisma.sanctionsWatchlist.findMany({
      where: {
        walletAddress: caseData.wallet_address,
        isActive: true,
      },
    });

    // Generate report data
    const reportData = {
      reportType: "LAW_ENFORCEMENT",
      caseId: caseData.id,
      walletAddress: caseData.wallet_address,
      riskScore: caseData.risk_score,
      status: caseData.status,
      assignedTo: caseData.assignedUser?.name,
      createdAt: caseData.created_at,
      updatedAt: caseData.updated_at,
      evidence: caseData.evidence,
      actions: caseData.actions,
      auditLogs: auditLogs,
      sanctionsData: sanctionsData,
      reportGeneratedAt: new Date().toISOString(),
      generatedBy: "CryptoCompliance System",
    };

    // Generate HTML report
    const html = generateLEReportHTML(reportData, reportType);

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, "../../reports/le");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate PDF
    const pdfPath = path.join(reportsDir, `le_case_${caseId}_${Date.now()}.pdf`);
    await generatePDF(html, pdfPath);

    // Save report record
    const reportRecord = await prisma.lEReport.create({
      data: {
        caseId: caseData.id,
        reportType: reportType,
        pdfPath: pdfPath,
        reportData: reportData,
        status: "GENERATED",
        generatedAt: new Date(),
      },
    });

    return {
      reportId: reportRecord.id,
      pdfPath: pdfPath,
      reportData: reportData,
    };
  } catch (error) {
    console.error("Error generating LE case report:", error);
    throw error;
  }
};

/**
 * Generate Evidence Chain Report
 */
const generateEvidenceChainReport = async (caseId) => {
  try {
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        evidence: {
          orderBy: { uploaded_at: "asc" },
        },
        actions: {
          include: {
            performer: true,
          },
          orderBy: { performed_at: "asc" },
        },
      },
    });

    if (!caseData) {
      throw new Error("Case not found");
    }

    // Create evidence timeline
    const evidenceTimeline = [];
    
    // Add evidence uploads
    caseData.evidence.forEach((evidence) => {
      evidenceTimeline.push({
        timestamp: evidence.uploaded_at,
        type: "EVIDENCE_UPLOAD",
        description: `${evidence.file_type} file uploaded`,
        details: {
          fileName: evidence.file_name,
          fileType: evidence.file_type,
          uploadedBy: evidence.uploaded_by,
          filePath: evidence.file_path,
        },
      });
    });

    // Add actions
    caseData.actions.forEach((action) => {
      evidenceTimeline.push({
        timestamp: action.performed_at,
        type: "ACTION",
        description: action.action,
        details: {
          performedBy: action.performer?.name,
          details: action.details,
        },
      });
    });

    // Sort timeline
    evidenceTimeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const reportData = {
      reportType: "EVIDENCE_CHAIN",
      caseId: caseData.id,
      walletAddress: caseData.wallet_address,
      evidenceTimeline: evidenceTimeline,
      totalEvidence: caseData.evidence.length,
      totalActions: caseData.actions.length,
      reportGeneratedAt: new Date().toISOString(),
    };

    const html = generateEvidenceChainHTML(reportData);
    const reportsDir = path.join(__dirname, "../../reports/le");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const pdfPath = path.join(reportsDir, `evidence_chain_${caseId}_${Date.now()}.pdf`);
    await generatePDF(html, pdfPath);

    return {
      pdfPath: pdfPath,
      reportData: reportData,
    };
  } catch (error) {
    console.error("Error generating evidence chain report:", error);
    throw error;
  }
};

/**
 * Generate Regulatory Compliance Report
 */
const generateRegulatoryReport = async (startDate, endDate, regulator = "FIU-IND") => {
  try {
    // Fetch cases in date range
    const cases = await prisma.case.findMany({
      where: {
        created_at: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        assignedUser: true,
        evidence: true,
        actions: true,
      },
    });

    // Fetch audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        created_at: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        actionType: {
          in: ["case_created", "case_updated", "str_generated", "evidence_uploaded"],
        },
      },
      include: {
        user: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Calculate statistics
    const stats = {
      totalCases: cases.length,
      newCases: cases.filter((c) => c.status === "New").length,
      investigatingCases: cases.filter((c) => c.status === "Investigating").length,
      filedCases: cases.filter((c) => c.status === "Filed").length,
      closedCases: cases.filter((c) => c.status === "Closed").length,
      totalEvidence: cases.reduce((sum, c) => sum + c.evidence.length, 0),
      totalActions: cases.reduce((sum, c) => sum + c.actions.length, 0),
      highRiskCases: cases.filter((c) => c.risk_score >= 70).length,
      averageRiskScore: cases.reduce((sum, c) => sum + c.risk_score, 0) / cases.length,
    };

    const reportData = {
      reportType: "REGULATORY_COMPLIANCE",
      regulator: regulator,
      period: {
        startDate: startDate,
        endDate: endDate,
      },
      statistics: stats,
      cases: cases,
      auditLogs: auditLogs,
      reportGeneratedAt: new Date().toISOString(),
    };

    const html = generateRegulatoryHTML(reportData);
    const reportsDir = path.join(__dirname, "../../reports/le");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const pdfPath = path.join(reportsDir, `regulatory_${regulator}_${startDate}_${endDate}.pdf`);
    await generatePDF(html, pdfPath);

    return {
      pdfPath: pdfPath,
      reportData: reportData,
    };
  } catch (error) {
    console.error("Error generating regulatory report:", error);
    throw error;
  }
};

/**
 * Generate PDF from HTML
 */
const generatePDF = async (html, outputPath) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    await page.pdf({
      path: outputPath,
      format: "A4",
      margin: {
        top: "1in",
        right: "1in",
        bottom: "1in",
        left: "1in",
      },
      printBackground: true,
    });

    await browser.close();
  } catch (error) {
    await browser.close();
    throw error;
  }
};

/**
 * Generate LE Report HTML
 */
const generateLEReportHTML = (data, reportType) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Law Enforcement Case Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #2c3e50; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
        .info-item { background: #f8f9fa; padding: 10px; border-radius: 5px; }
        .info-label { font-weight: bold; color: #495057; }
        .timeline { margin: 15px 0; }
        .timeline-item { border-left: 3px solid #007bff; padding-left: 15px; margin: 10px 0; }
        .evidence-list { list-style: none; padding: 0; }
        .evidence-item { background: #e9ecef; padding: 10px; margin: 5px 0; border-radius: 5px; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Law Enforcement Case Report</h1>
        <p>Case ID: ${data.caseId}</p>
        <p>Generated: ${new Date(data.reportGeneratedAt).toLocaleString()}</p>
      </div>

      <div class="section">
        <h2>Case Summary</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Wallet Address:</div>
            <div>${data.walletAddress}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Risk Score:</div>
            <div>${data.riskScore}/100</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status:</div>
            <div>${data.status}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Assigned To:</div>
            <div>${data.assignedTo || "Unassigned"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Evidence</h2>
        <ul class="evidence-list">
          ${data.evidence.map(evidence => `
            <li class="evidence-item">
              <strong>${evidence.file_type}</strong>: ${evidence.file_name}<br>
              <small>Uploaded: ${new Date(evidence.uploaded_at).toLocaleString()}</small>
            </li>
          `).join("")}
        </ul>
      </div>

      <div class="section">
        <h2>Investigation Timeline</h2>
        <div class="timeline">
          ${data.actions.map(action => `
            <div class="timeline-item">
              <strong>${new Date(action.performed_at).toLocaleString()}</strong><br>
              ${action.action} - ${action.performer?.name || "System"}
            </div>
          `).join("")}
        </div>
      </div>

      ${data.sanctionsData.length > 0 ? `
        <div class="section">
          <h2>Sanctions Information</h2>
          <div class="info-grid">
            ${data.sanctionsData.map(sanction => `
              <div class="info-item">
                <div class="info-label">Source:</div>
                <div>${sanction.source}</div>
                <div class="info-label">Entity:</div>
                <div>${sanction.entity_name}</div>
                <div class="info-label">Risk Level:</div>
                <div>${sanction.risk_level}</div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div class="footer">
        <p>This report was generated by the CryptoCompliance System for law enforcement purposes.</p>
        <p>Report Type: ${reportType} | Generated At: ${new Date(data.reportGeneratedAt).toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate Evidence Chain HTML
 */
const generateEvidenceChainHTML = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Evidence Chain Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .timeline { margin: 15px 0; }
        .timeline-item { border-left: 3px solid #28a745; padding-left: 15px; margin: 10px 0; }
        .evidence { border-left-color: #007bff; }
        .action { border-left-color: #ffc107; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Evidence Chain Report</h1>
        <p>Case ID: ${data.caseId}</p>
        <p>Wallet: ${data.walletAddress}</p>
      </div>

      <div class="timeline">
        ${data.evidenceTimeline.map(item => `
          <div class="timeline-item ${item.type === 'EVIDENCE_UPLOAD' ? 'evidence' : 'action'}">
            <strong>${new Date(item.timestamp).toLocaleString()}</strong><br>
            <strong>${item.type}</strong>: ${item.description}<br>
            ${item.details ? `<small>Details: ${JSON.stringify(item.details)}</small>` : ""}
          </div>
        `).join("")}
      </div>

      <div class="footer">
        <p>Total Evidence: ${data.totalEvidence} | Total Actions: ${data.totalActions}</p>
        <p>Generated: ${new Date(data.reportGeneratedAt).toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate Regulatory Report HTML
 */
const generateRegulatoryHTML = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Regulatory Compliance Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .stat-item { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Regulatory Compliance Report</h1>
        <p>Regulator: ${data.regulator}</p>
        <p>Period: ${data.period.startDate} to ${data.period.endDate}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">${data.statistics.totalCases}</div>
          <div>Total Cases</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${data.statistics.highRiskCases}</div>
          <div>High Risk Cases</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${data.statistics.totalEvidence}</div>
          <div>Evidence Items</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${data.statistics.newCases}</div>
          <div>New Cases</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${data.statistics.filedCases}</div>
          <div>Filed Cases</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${Math.round(data.statistics.averageRiskScore)}</div>
          <div>Avg Risk Score</div>
        </div>
      </div>

      <div class="footer">
        <p>Generated: ${new Date(data.reportGeneratedAt).toLocaleString()}</p>
        <p>This report is for regulatory compliance purposes.</p>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  generateLECaseReport,
  generateEvidenceChainReport,
  generateRegulatoryReport,
}; 