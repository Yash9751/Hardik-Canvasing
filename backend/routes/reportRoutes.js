const express = require('express');
const router = express.Router();
const { 
  getProductReport, 
  getPartyReport, 
  getDateRangeReport 
} = require('../controllers/reportController');

router.get('/product', getProductReport);
router.get('/party', getPartyReport);
router.get('/daterange', getDateRangeReport);

module.exports = router; 