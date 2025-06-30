const express = require('express');
const router = express.Router();
const exPlantsController = require('../controllers/exPlantsController');

// Get all ex plants
router.get('/', exPlantsController.getAllExPlants);

// Get ex plant by ID
router.get('/:id', exPlantsController.getExPlantById);

// Create new ex plant
router.post('/', exPlantsController.createExPlant);

// Update ex plant
router.put('/:id', exPlantsController.updateExPlant);

// Delete ex plant
router.delete('/:id', exPlantsController.deleteExPlant);

module.exports = router; 