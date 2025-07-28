const express = require('express');
const router = express.Router();
const {
  getSummary,
  getTodaySummary,
  getTodayLoading,
  getTodayPurchaseLoading,
  getTodaySellLoading,
  getTodaysPurchaseDetails,
  getTodaysSellDetails,
  getPurchaseLoadingDetails,
  getSellLoadingDetails
} = require('../controllers/dashboardController');

// Get dashboard summary
router.get('/', getSummary);

// Get today's summary
router.get('/today', getTodaySummary);

// Get today's loading summary
router.get('/today-loading', getTodayLoading);

// Get today's purchase loading summary
router.get('/today-purchase-loading', getTodayPurchaseLoading);

// Get today's sell loading summary
router.get('/today-sell-loading', getTodaySellLoading);

// New detail routes
router.get('/todays-purchase-details', getTodaysPurchaseDetails);
router.get('/todays-sell-details', getTodaysSellDetails);
router.get('/purchase-loading-details', getPurchaseLoadingDetails);
router.get('/sell-loading-details', getSellLoadingDetails);

module.exports = router; 