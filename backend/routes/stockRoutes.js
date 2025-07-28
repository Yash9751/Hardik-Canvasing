const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// Get all stock
router.get('/', stockController.getAllStock);

// Get stock with party-wise breakdown
router.get('/party-breakdown', stockController.getStockWithPartyBreakdown);

// Recalculate all stock (utility)
router.post('/recalculate-all', stockController.recalculateAllStock);

// Get stock summary
router.get('/summary', stockController.getStockSummary);

// Get stock by item
router.get('/item/:itemId', stockController.getStockByItem);

// Get stock by ex plant
router.get('/ex-plant/:exPlantId', stockController.getStockByExPlant);

// TEMP DEBUG: Get all raw stock rows
router.get('/raw', stockController.getRawStock);

module.exports = router; 