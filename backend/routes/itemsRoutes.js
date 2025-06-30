const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');

// Get all items
router.get('/', itemsController.getAllItems);

// Get item by ID
router.get('/:id', itemsController.getItemById);

// Create new item
router.post('/', itemsController.createItem);

// Update item
router.put('/:id', itemsController.updateItem);

// Delete item
router.delete('/:id', itemsController.deleteItem);

module.exports = router; 