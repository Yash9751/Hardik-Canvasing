const express = require('express');
const router = express.Router();
const { 
  getDailyPlusMinus, 
  generateDailyPlusMinus, 
  getPlusMinusSummary, 
  getTodayPlusMinus 
} = require('../controllers/plusMinusController');

router.get('/', getDailyPlusMinus);
router.post('/generate', generateDailyPlusMinus);
router.get('/summary', getPlusMinusSummary);
router.get('/today', getTodayPlusMinus);

module.exports = router; 