const db = require('../db');

// Get current rates for all items
const getCurrentRates = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*, i.item_name, i.hsn_code
      FROM rates r
      JOIN items i ON r.item_id = i.id
      WHERE r.effective_date = (
        SELECT MAX(effective_date) 
        FROM rates r2 
        WHERE r2.item_id = r.item_id
      )
      ORDER BY i.item_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting current rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get rate by ID
const getRateById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT r.*, i.item_name, i.hsn_code
      FROM rates r
      JOIN items i ON r.item_id = i.id
      WHERE r.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rate not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new rate
const createRate = async (req, res) => {
  try {
    const { item_id, rate_per_10kg, effective_date } = req.body;

    if (!item_id || !rate_per_10kg || !effective_date) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const result = await db.query(
      'INSERT INTO rates (item_id, rate_per_10kg, effective_date) VALUES ($1, $2, $3) RETURNING *',
      [item_id, rate_per_10kg, effective_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating rate:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Rate for this item and date already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update rate
const updateRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { item_id, rate_per_10kg, effective_date } = req.body;

    const result = await db.query(
      'UPDATE rates SET item_id = $1, rate_per_10kg = $2, effective_date = $3 WHERE id = $4 RETURNING *',
      [item_id, rate_per_10kg, effective_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating rate:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Rate for this item and date already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete rate
const deleteRate = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM rates WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rate not found' });
    }
    
    res.json({ message: 'Rate deleted successfully' });
  } catch (error) {
    console.error('Error deleting rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get rate history for an item
const getRateHistory = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT r.*, i.item_name, i.hsn_code
      FROM rates r
      JOIN items i ON r.item_id = i.id
      WHERE r.item_id = $1
    `;
    const params = [itemId];

    if (start_date) {
      query += ' AND r.effective_date >= $2';
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      query += ` AND r.effective_date <= $${paramIndex}`;
      params.push(end_date);
    }

    query += ' ORDER BY r.effective_date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting rate history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCurrentRates,
  getRateById,
  createRate,
  updateRate,
  deleteRate,
  getRateHistory
}; 