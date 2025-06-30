const express = require('express');
const router = express.Router();
const brokersController = require('../controllers/brokersController');

// Get all brokers
router.get('/', brokersController.getAllBrokers);

// Get broker by ID
router.get('/:id', brokersController.getBrokerById);

// Create new broker
router.post('/', brokersController.createBroker);

// Update broker
router.put('/:id', brokersController.updateBroker);

// Delete broker
router.delete('/:id', brokersController.deleteBroker);

module.exports = router; 