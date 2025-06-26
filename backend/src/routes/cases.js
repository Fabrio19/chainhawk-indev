const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { uploadFile, downloadFile, getFileMetadata } = require('../services/minioService');

// Configure multer for memory storage (files will be uploaded to MinIO)
const storage = multer.memoryStorage();

// File filter for validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only PDF, JPG, PNG files are allowed.'), false);
  }

  if (file.size > maxSize) {
    return cb(new Error('File too large. Maximum size is 10MB.'), false);
  }

  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Get all cases
router.get('/', async (req, res) => {
  try {
    const cases = await prisma.case.findMany();
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get case by ID
router.get('/:id', async (req, res) => {
  try {
    const foundCase = await prisma.case.findUnique({ where: { id: req.params.id } });
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });
    res.json(foundCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new case
router.post('/', async (req, res) => {
  try {
    const caseData = req.body;
    const newCase = await prisma.case.create({
      data: caseData,
      include: {
        assignedUser: true,
      },
    });

    // Trigger webhook for case creation
    try {
      const { triggerWebhook } = require("../services/webhookService");
      await triggerWebhook("case_created", {
        caseId: newCase.id,
        walletAddress: newCase.wallet_address,
        riskScore: newCase.risk_score,
        status: newCase.status,
        assignedTo: newCase.assignedUser?.name,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to trigger webhook:", error);
    }

    res.status(201).json(newCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update case
router.put('/:id', async (req, res) => {
  try {
    const caseId = req.params.id;
    const updateData = req.body;
    
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: updateData,
      include: {
        assignedUser: true,
      },
    });

    // Trigger webhook for case update
    try {
      const { triggerWebhook } = require("../services/webhookService");
      await triggerWebhook("case_updated", {
        caseId: updatedCase.id,
        walletAddress: updatedCase.wallet_address,
        status: updatedCase.status,
        riskScore: updatedCase.risk_score,
        assignedTo: updatedCase.assignedUser?.name,
        timestamp: new Date().toISOString(),
        changes: updateData,
      });
    } catch (error) {
      console.error("Failed to trigger webhook:", error);
    }

    res.json(updatedCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete case
router.delete('/:id', async (req, res) => {
  try {
    await prisma.case.delete({ where: { id: req.params.id } });
    res.json({ message: 'Case deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/cases/:id -- Update status, assign, etc.
router.patch('/:id', async (req, res) => {
  try {
    const updated = await prisma.case.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/cases/:id/evidence -- Add evidence to a case
router.post('/:id/evidence', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate case exists
    const caseExists = await prisma.case.findUnique({
      where: { id: req.params.id }
    });
    if (!caseExists) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Determine file type based on mimetype
    let fileType;
    switch (req.file.mimetype) {
      case 'application/pdf':
        fileType = 'KYC';
        break;
      case 'image/jpeg':
      case 'image/png':
      case 'image/jpg':
        fileType = 'Screenshot';
        break;
      default:
        fileType = 'Note';
    }

    // Upload file to MinIO
    const uploadResult = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      fileType,
      req.params.id
    );

    // Create evidence record in database
    const evidence = await prisma.evidence.create({
      data: {
        case_id: req.params.id,
        object_key: uploadResult.objectKey,
        file_name: uploadResult.fileName,
        file_type: fileType,
        file_size: uploadResult.size,
        content_type: req.file.mimetype,
        uploaded_by: req.body.uploaded_by || 'system', // TODO: Get from auth middleware
        description: req.body.description || null
      }
    });

    res.status(201).json({
      ...evidence,
      uploadResult: {
        objectKey: uploadResult.objectKey,
        bucketName: uploadResult.bucketName,
        size: uploadResult.size
      }
    });
  } catch (err) {
    console.error('Evidence upload error:', err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/cases/:id/evidence -- List evidence for a case
router.get('/:id/evidence', async (req, res) => {
  try {
    const evidence = await prisma.evidence.findMany({
      where: { case_id: req.params.id },
    });
    res.json(evidence);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cases/:id/actions -- Add action log to a case
router.post('/:id/actions', async (req, res) => {
  try {
    const action = await prisma.caseAction.create({
      data: { ...req.body, case_id: req.params.id },
    });
    res.status(201).json(action);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Helper: Render HTML for STR report (reuse from strReports.js)
function renderSTRHtml(data) {
  return `
    <html>
      <head><title>STR Report</title></head>
      <body>
        <h1>STR Report</h1>
        <h2>Case Summary</h2>
        <p>${data.caseSummary || ''}</p>
        <h2>Wallet Details</h2>
        <p>Wallet: ${data.walletAddress || ''}</p>
        <p>Risk Score: ${data.riskScore || ''}</p>
        <h2>Transaction Details</h2>
        <p>Last Tx: ${data.lastTxHash || ''}</p>
        <p>Flow: ${data.flowSummary || ''}</p>
        <h2>KYC Info</h2>
        <p>Name: ${data.kycName || ''}</p>
        <p>ID: ${data.kycIdNumber || ''}</p>
        <p>Address: ${data.kycAddress || ''}</p>
        <h2>Evidence</h2>
        <ul>${(data.evidenceFiles||[]).map(f=>`<li>${f.file_type}: ${f.file_path}</li>`).join('')}</ul>
        <h2>Action History</h2>
        <ul>${(data.actionHistory||[]).map(a=>`<li>${a.performed_by}: ${a.action} (${a.performed_at})</li>`).join('')}</ul>
        <h2>Investigator</h2>
        <p>${data.investigatorName || ''}</p>
        <h2>Generated At</h2>
        <p>${data.generatedAt || new Date().toISOString()}</p>
        <hr/>
        <p style='font-size:10px;color:#888;'>For internal FIU-IND reporting only.</p>
      </body>
    </html>
  `;
}

// POST /api/cases/:id/generate-str -- Generate STR PDF for a case (real logic)
router.post('/:id/generate-str', async (req, res) => {
  try {
    const caseId = req.params.id;
    // 1. Fetch all related data
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        assignedUser: true,
        evidence: true,
        actions: true,
      },
    });
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    // 2. Assemble STR report data
    const strData = {
      caseSummary: caseData.related_tx_hash ? `Related Tx: ${caseData.related_tx_hash}` : '',
      walletAddress: caseData.wallet_address,
      riskScore: caseData.risk_score,
      lastTxHash: caseData.related_tx_hash,
      flowSummary: '', // You can enhance this with more tx info
      kycName: caseData.assignedUser?.name || '',
      kycIdNumber: '', // Add if available
      kycAddress: '', // Add if available
      evidenceFiles: caseData.evidence,
      actionHistory: caseData.actions,
      investigatorName: caseData.assignedUser?.name || '',
      generatedAt: new Date().toLocaleString(),
    };
    // 3. Render HTML
    const html = renderSTRHtml(strData);
    // 4. Generate PDF
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
    const pdfPath = path.join(reportsDir, `str_${caseId}.pdf`);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4' });
    await browser.close();
    // 5. Save or update STRReport record
    let strReport = await prisma.sTRReport.findFirst({ where: { case_id: caseId } });
    if (strReport) {
      strReport = await prisma.sTRReport.update({
        where: { id: strReport.id },
        data: { pdf_path: pdfPath, status: 'Generated', created_at: new Date() },
      });
    } else {
      strReport = await prisma.sTRReport.create({
        data: { case_id: caseId, pdf_path: pdfPath, status: 'Generated', created_at: new Date() },
      });
    }
    // 6. Return STRReport record
    res.status(201).json(strReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/:id/str-report -- Download STR PDF for a case (real logic)
router.get('/:id/str-report', async (req, res) => {
  try {
    const caseId = req.params.id;
    const strReport = await prisma.sTRReport.findFirst({ where: { case_id: caseId } });
    if (!strReport || !strReport.pdf_path) return res.status(404).json({ error: 'STR PDF not found' });
    res.download(strReport.pdf_path, `str_report_${caseId}.pdf`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

// GET /api/cases/:id/evidence/:evidenceId/download -- Download evidence file
router.get('/:id/evidence/:evidenceId/download', async (req, res) => {
  try {
    const evidence = await prisma.evidence.findUnique({
      where: { id: req.params.evidenceId }
    });
    
    if (!evidence || evidence.case_id !== req.params.id) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Get file stream from MinIO
    const fileStream = await downloadFile(evidence.object_key);
    
    // Get file metadata for headers
    const metadata = await getFileMetadata(evidence.object_key);
    
    // Set response headers
    res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.file_name}"`);
    res.setHeader('Content-Length', metadata.size);
    
    // Stream file to response
    fileStream.pipe(res);
    
    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'File download failed' });
      }
    });
  } catch (err) {
    console.error('Evidence download error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 