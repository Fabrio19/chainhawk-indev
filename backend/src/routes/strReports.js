const express = require('express');
const router = express.Router();
const {
  generateSTRReport,
  downloadSTRReport,
  getSTRReports,
  getSTRReportById,
  updateSTRReport,
  deleteSTRReport,
} = require('../controllers/strReportsController');
const { authenticateToken } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all STR reports
router.get('/', auditLog, getSTRReports);

// Get STR report by ID
router.get('/:id', auditLog, getSTRReportById);

// Generate new STR report
router.post('/', auditLog, generateSTRReport);

// Download STR report
router.get('/:id/download', auditLog, downloadSTRReport);

// Update STR report
router.put('/:id', auditLog, updateSTRReport);

// Delete STR report
router.delete('/:id', auditLog, deleteSTRReport);

module.exports = router; 