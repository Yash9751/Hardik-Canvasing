const express = require('express');
const router = express.Router();
const saudaController = require('../controllers/saudaController');

// Get all sauda transactions
router.get('/', saudaController.getAllSauda);

// Get pending sauda
router.get('/pending', saudaController.getPendingSauda);

// Get next sauda number
router.get('/next-number', saudaController.getNextSaudaNumber);

// Download Sauda Note PDF - This must come before /:id route
router.get('/:id/pdf', saudaController.generateSaudaNotePDF);

// Generate Sauda Message - This must come before /:id route
router.get('/:id/message', saudaController.generateSaudaMessage);

// Get sauda by ID
router.get('/:id', saudaController.getSaudaById);

// Create new sauda
router.post('/', saudaController.createSauda);

// Update sauda
router.put('/:id', saudaController.updateSauda);

// Delete sauda
router.delete('/:id', saudaController.deleteSauda);

module.exports = router; 