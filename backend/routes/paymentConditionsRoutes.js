const express = require('express');
const router = express.Router();
const paymentConditionsController = require('../controllers/paymentConditionsController');

// Get all payment conditions
router.get('/', paymentConditionsController.getAllPaymentConditions);

// Get payment condition by ID
router.get('/:id', paymentConditionsController.getPaymentConditionById);

// Create new payment condition
router.post('/', paymentConditionsController.createPaymentCondition);

// Update payment condition
router.put('/:id', paymentConditionsController.updatePaymentCondition);

// Delete payment condition
router.delete('/:id', paymentConditionsController.deletePaymentCondition);

module.exports = router; 