const db = require('../db');

// Get all loading entries
const getAllLoading = async (req, res) => {
  try {
    const { sauda_id, date } = req.query;
    let query = `
      SELECT l.*, s.sauda_no, s.transaction_type, p.party_name, i.item_name, ep.plant_name
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      WHERE 1=1
    `;
    const params = [];

    if (sauda_id) {
      query += ' AND l.sauda_id = $1';
      params.push(sauda_id);
    }

    if (date) {
      const paramIndex = params.length + 1;
      query += ` AND l.loading_date = $${paramIndex}`;
      params.push(date);
    }

    query += ' ORDER BY l.loading_date DESC, l.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get loading by ID
const getLoadingById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT l.*, s.sauda_no, s.transaction_type, p.party_name, i.item_name, ep.plant_name
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      WHERE l.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loading entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new loading entry
const createLoading = async (req, res) => {
  try {
    const { sauda_id, loading_date, vajan_kg, note } = req.body;

    if (!sauda_id || !loading_date || !vajan_kg) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const result = await db.query(
      'INSERT INTO loading (sauda_id, loading_date, vajan_kg, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [sauda_id, loading_date, vajan_kg, note]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update loading entry
const updateLoading = async (req, res) => {
  try {
    const { id } = req.params;
    const { sauda_id, loading_date, vajan_kg, note } = req.body;

    const result = await db.query(
      'UPDATE loading SET sauda_id = $1, loading_date = $2, vajan_kg = $3, note = $4 WHERE id = $5 RETURNING *',
      [sauda_id, loading_date, vajan_kg, note, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loading entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete loading entry
const deleteLoading = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM loading WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loading entry not found' });
    }
    
    res.json({ message: 'Loading entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllLoading,
  getLoadingById,
  createLoading,
  updateLoading,
  deleteLoading
}; 