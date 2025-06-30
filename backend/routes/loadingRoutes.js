const express = require('express');
const router = express.Router();
const loadingController = require('../controllers/loadingController');

// Get all loading entries
router.get('/', loadingController.getAllLoading);

// Get loading by ID
router.get('/:id', loadingController.getLoadingById);

// Create new loading entry
router.post('/', loadingController.createLoading);

// Update loading entry
router.put('/:id', loadingController.updateLoading);

// Delete loading entry
router.delete('/:id', loadingController.deleteLoading);

module.exports = router; 