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

module.exports = router; 