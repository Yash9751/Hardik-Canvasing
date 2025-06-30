const express = require('express');
const router = express.Router();
const partiesController = require('../controllers/partiesController');

// Get all parties
router.get('/', partiesController.getAllParties);

// Get party by ID
router.get('/:id', partiesController.getPartyById);

// Create new party
router.post('/', partiesController.createParty);

// Update party
router.put('/:id', partiesController.updateParty);

// Delete party
router.delete('/:id', partiesController.deleteParty);

module.exports = router; 