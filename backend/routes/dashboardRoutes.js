const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Get dashboard summary
router.get('/summary', dashboardController.getSummary);

// Get today's summary
router.get('/today', dashboardController.getTodaySummary);

// Get today's loading
router.get('/today-loading', dashboardController.getTodayLoading);

// Get today's purchase loading summary
router.get('/today-purchase-loading', dashboardController.getTodayPurchaseLoading);

// Get today's sell loading summary
router.get('/today-sell-loading', dashboardController.getTodaySellLoading);

module.exports = router; 