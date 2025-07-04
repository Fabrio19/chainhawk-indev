const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

class AdvancedPdfService {
  constructor() {
    this.prisma = new PrismaClient();
    this.reportsDir = process.env.PDF_REPORTS_DIR || './reports/pdf';
  }

  async generateTransactionTracePDF(traceData, options = {}) {
    try {
      const html = this.generateTraceHTML(traceData, options);
      const filename = `trace-${traceData.traceId}-${Date.now()}.pdf`;
      const filepath = path.join(this.reportsDir, filename);
      
      await this.ensureDirectoryExists(this.reportsDir);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      await browser.close();
      await fs.writeFile(filepath, pdf);
      
      console.log(`PDF generated: ${filepath}`);
      
      return {
        filename,
        filepath,
        size: pdf.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  async generateRiskAssessmentPDF(assessmentData, options = {}) {
    try {
      const html = this.generateRiskAssessmentHTML(assessmentData, options);
      const filename = `risk-assessment-${Date.now()}.pdf`;
      const filepath = path.join(this.reportsDir, filename);
      
      await this.ensureDirectoryExists(this.reportsDir);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      await browser.close();
      await fs.writeFile(filepath, pdf);
      
      console.log(`Risk assessment PDF generated: ${filepath}`);
      
      return {
        filename,
        filepath,
        size: pdf.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating risk assessment PDF:', error);
      throw error;
    }
  }

  async generateComplianceReportPDF(reportData, options = {}) {
    try {
      const html = this.generateComplianceReportHTML(reportData, options);
      const filename = `compliance-report-${Date.now()}.pdf`;
      const filepath = path.join(this.reportsDir, filename);
      
      await this.ensureDirectoryExists(this.reportsDir);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      await browser.close();
      await fs.writeFile(filepath, pdf);
      
      console.log(`Compliance report PDF generated: ${filepath}`);
      
      return {
        filename,
        filepath,
        size: pdf.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating compliance report PDF:', error);
      throw error;
    }
  }

  generateTraceHTML(traceData, options = {}) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Transaction Trace Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #667eea; color: white; padding: 20px; border-radius: 8px; }
          .summary { margin: 20px 0; }
          .step { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .risk-high { background: #ffebee; }
          .risk-medium { background: #fff3e0; }
          .risk-low { background: #e8f5e8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Transaction Trace Report</h1>
          <p>Trace ID: ${traceData.traceId}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
          <h2>Summary</h2>
          <p>Total Steps: ${traceData.steps?.length || 0}</p>
          <p>Total Volume: ${traceData.totalVolume || 0}</p>
          <p>Risk Score: ${(traceData.riskScore * 100).toFixed(1)}%</p>
        </div>
        
        <div class="steps">
          <h2>Transaction Flow</h2>
          ${traceData.steps?.map((step, index) => `
            <div class="step risk-${this.getRiskClass(step.riskScore)}">
              <h3>Step ${index + 1}</h3>
              <p><strong>From:</strong> ${step.sourceAddress}</p>
              <p><strong>To:</strong> ${step.destinationAddress}</p>
              <p><strong>Amount:</strong> ${step.amount} ${step.token}</p>
              <p><strong>Risk:</strong> ${(step.riskScore * 100).toFixed(1)}%</p>
            </div>
          `).join('') || '<p>No trace steps available</p>'}
        </div>
      </body>
      </html>
    `;
  }

  generateRiskAssessmentHTML(assessmentData, options = {}) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Risk Assessment Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #ff6b6b; color: white; padding: 20px; border-radius: 8px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
          .metric { background: white; border: 1px solid #ddd; padding: 20px; text-align: center; border-radius: 5px; }
          .metric-value { font-size: 2em; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Risk Assessment Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="metrics">
          <div class="metric">
            <div class="metric-value">${(assessmentData.overallRisk * 100).toFixed(1)}%</div>
            <div>Overall Risk Score</div>
          </div>
          <div class="metric">
            <div class="metric-value">${assessmentData.transactionCount || 0}</div>
            <div>Transactions Analyzed</div>
          </div>
          <div class="metric">
            <div class="metric-value">${assessmentData.highRiskCount || 0}</div>
            <div>High Risk Transactions</div>
          </div>
          <div class="metric">
            <div class="metric-value">${assessmentData.totalVolume || 0}</div>
            <div>Total Volume</div>
          </div>
        </div>
        
        <div class="recommendations">
          <h2>Recommendations</h2>
          <ul>
            ${assessmentData.recommendations?.map(rec => `<li>${rec}</li>`).join('') || '<li>No specific recommendations available</li>'}
          </ul>
        </div>
      </body>
      </html>
    `;
  }

  generateComplianceReportHTML(reportData, options = {}) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Compliance Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; border-radius: 8px; }
          .summary { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f2f2f2; }
          .status-pass { color: #4CAF50; font-weight: bold; }
          .status-fail { color: #f44336; font-weight: bold; }
          .status-warning { color: #ff9800; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Compliance Report</h1>
          <p>Period: ${reportData.period || 'N/A'}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
          <h2>Compliance Summary</h2>
          <p>Overall Status: <span class="status-${reportData.overallStatus}">${reportData.overallStatus.toUpperCase()}</span></p>
          <p>Checks Performed: ${reportData.totalChecks || 0}</p>
          <p>Passed Checks: ${reportData.passedChecks || 0}</p>
          <p>Failed Checks: ${reportData.failedChecks || 0}</p>
        </div>
        
        <div class="checks">
          <h2>Detailed Compliance Checks</h2>
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Description</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.checks?.map(check => `
                <tr>
                  <td>${check.name}</td>
                  <td class="status-${check.status}">${check.status.toUpperCase()}</td>
                  <td>${check.description}</td>
                  <td>${check.details || 'N/A'}</td>
                </tr>
              `).join('') || '<tr><td colspan="4">No compliance checks available</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
  }

  getRiskClass(riskScore) {
    if (riskScore > 0.8) return 'high';
    if (riskScore > 0.4) return 'medium';
    return 'low';
  }

  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

module.exports = AdvancedPdfService; 