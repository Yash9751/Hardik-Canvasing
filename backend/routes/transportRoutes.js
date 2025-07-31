const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');

// Get all transports
router.get('/', transportController.getAllTransports);

// Get transport by ID
router.get('/:id', transportController.getTransportById);

// Create new transport
router.post('/', transportController.createTransport);

// Update transport
router.put('/:id', transportController.updateTransport);

// Delete transport
router.delete('/:id', transportController.deleteTransport);

module.exports = router; 