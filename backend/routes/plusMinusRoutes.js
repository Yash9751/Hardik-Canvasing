const express = require('express');
const router = express.Router();
const plusMinusController = require('../controllers/plusMinusController');
const { 
  getDailyPlusMinus, 
  generateDailyPlusMinus, 
  getPlusMinusSummary, 
  getTodayPlusMinus,
  exportPDF,
  exportExcel
} = require('../controllers/plusMinusController');

router.get('/', getDailyPlusMinus);
router.post('/generate', generateDailyPlusMinus);
router.get('/summary', getPlusMinusSummary);
router.get('/today', getTodayPlusMinus);

// Export routes
router.get('/export/pdf', exportPDF);
router.get('/export/excel', exportExcel);

// Recalculate all plus_minus (utility)
router.post('/recalculate-all', plusMinusController.recalculateAllPlusMinus);

module.exports = router; 