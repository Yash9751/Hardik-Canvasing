const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

// Get all trades report
router.get('/all-trades', reportsController.getAllTrades);

// Get pending trades report
router.get('/pending-trades', reportsController.getPendingTrades);

// Get overdue trades report
router.get('/overdue-trades', reportsController.getOverdueTrades);

// Get stock-wise report
router.get('/stock-wise', reportsController.getStockWiseReport);

// Get party-wise report
router.get('/party-wise', reportsController.getPartyWiseReport);

// Get broker-wise report
router.get('/broker-wise', reportsController.getBrokerWiseReport);

// Export to Excel
router.get('/export/excel', reportsController.exportExcel);
// Export to PDF
router.get('/export/pdf', reportsController.exportPDF);

module.exports = router; 