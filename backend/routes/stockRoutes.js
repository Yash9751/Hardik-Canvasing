const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// Get all stock
router.get('/', stockController.getAllStock);

// Get stock summary
router.get('/summary', stockController.getStockSummary);

// Get stock by item
router.get('/item/:itemId', stockController.getStockByItem);

// Get stock by ex plant
router.get('/ex-plant/:exPlantId', stockController.getStockByExPlant);

module.exports = router; 