const db = require('../db');

// Get all payment conditions
const getAllPaymentConditions = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM payment_conditions ORDER BY condition_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting payment conditions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get payment condition by ID
const getPaymentConditionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM payment_conditions WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment condition not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting payment condition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new payment condition
const createPaymentCondition = async (req, res) => {
  try {
    const { condition_name } = req.body;

    if (!condition_name) {
      return res.status(400).json({ error: 'Condition name is required' });
    }

    const result = await db.query(
      'INSERT INTO payment_conditions (condition_name) VALUES ($1) RETURNING *',
      [condition_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payment condition:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Condition name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update payment condition
const updatePaymentCondition = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition_name } = req.body;

    const result = await db.query(
      'UPDATE payment_conditions SET condition_name = $1 WHERE id = $2 RETURNING *',
      [condition_name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment condition not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment condition:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Condition name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete payment condition
const deletePaymentCondition = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM payment_conditions WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment condition not found' });
    }
    
    res.json({ message: 'Payment condition deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment condition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllPaymentConditions,
  getPaymentConditionById,
  createPaymentCondition,
  updatePaymentCondition,
  deletePaymentCondition
}; 