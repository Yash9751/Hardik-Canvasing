const express = require('express');
const router = express.Router();
const deliveryConditionsController = require('../controllers/deliveryConditionsController');

// Get all delivery conditions
router.get('/', deliveryConditionsController.getAllDeliveryConditions);

// Get delivery condition by ID
router.get('/:id', deliveryConditionsController.getDeliveryConditionById);

// Create new delivery condition
router.post('/', deliveryConditionsController.createDeliveryCondition);

// Update delivery condition
router.put('/:id', deliveryConditionsController.updateDeliveryCondition);

// Delete delivery condition
router.delete('/:id', deliveryConditionsController.deleteDeliveryCondition);

module.exports = router; 