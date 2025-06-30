const express = require('express');
const router = express.Router();
const ratesController = require('../controllers/ratesController');

// Get current rates for all items
router.get('/current', ratesController.getCurrentRates);

// Get rate history for an item
router.get('/history/:itemId', ratesController.getRateHistory);

// Get rate by ID
router.get('/:id', ratesController.getRateById);

// Create new rate
router.post('/', ratesController.createRate);

// Update rate
router.put('/:id', ratesController.updateRate);

// Delete rate
router.delete('/:id', ratesController.deleteRate);

module.exports = router; 