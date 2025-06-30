const db = require('../db');

// Get all delivery conditions
const getAllDeliveryConditions = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM delivery_conditions ORDER BY condition_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting delivery conditions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get delivery condition by ID
const getDeliveryConditionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM delivery_conditions WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery condition not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting delivery condition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new delivery condition
const createDeliveryCondition = async (req, res) => {
  try {
    const { condition_name } = req.body;

    if (!condition_name) {
      return res.status(400).json({ error: 'Condition name is required' });
    }

    const result = await db.query(
      'INSERT INTO delivery_conditions (condition_name) VALUES ($1) RETURNING *',
      [condition_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating delivery condition:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Condition name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update delivery condition
const updateDeliveryCondition = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition_name } = req.body;

    const result = await db.query(
      'UPDATE delivery_conditions SET condition_name = $1 WHERE id = $2 RETURNING *',
      [condition_name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery condition not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating delivery condition:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Condition name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete delivery condition
const deleteDeliveryCondition = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM delivery_conditions WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery condition not found' });
    }
    
    res.json({ message: 'Delivery condition deleted successfully' });
  } catch (error) {
    console.error('Error deleting delivery condition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllDeliveryConditions,
  getDeliveryConditionById,
  createDeliveryCondition,
  updateDeliveryCondition,
  deleteDeliveryCondition
}; 