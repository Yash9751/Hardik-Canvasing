const db = require('../db');

// Get all parties
const getAllParties = async (req, res) => {
  try {
    const { party_type, search } = req.query;
    let query = 'SELECT * FROM parties WHERE 1=1';
    const params = [];

    if (party_type && party_type !== 'both') {
      query += ' AND (party_type = $1 OR party_type = $2)';
      params.push(party_type, 'both');
    }

    if (search) {
      query += ' AND (party_name ILIKE $' + (params.length + 1) + ' OR city ILIKE $' + (params.length + 1) + ')';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY party_name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting parties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get party by ID
const getPartyById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM parties WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting party:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new party
const createParty = async (req, res) => {
  try {
    const {
      party_name,
      city,
      gst_no,
      contact_person,
      mobile_number,
      email,
      party_type = 'both'
    } = req.body;

    if (!party_name) {
      return res.status(400).json({ error: 'Party name is required' });
    }

    const result = await db.query(
      'INSERT INTO parties (party_name, city, gst_no, contact_person, mobile_number, email, party_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [party_name, city, gst_no, contact_person, mobile_number, email, party_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating party:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Party name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update party
const updateParty = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      party_name,
      city,
      gst_no,
      contact_person,
      mobile_number,
      email,
      party_type
    } = req.body;

    const result = await db.query(
      'UPDATE parties SET party_name = $1, city = $2, gst_no = $3, contact_person = $4, mobile_number = $5, email = $6, party_type = $7 WHERE id = $8 RETURNING *',
      [party_name, city, gst_no, contact_person, mobile_number, email, party_type, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating party:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Party name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete party
const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM parties WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json({ message: 'Party deleted successfully' });
  } catch (error) {
    console.error('Error deleting party:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllParties,
  getPartyById,
  createParty,
  updateParty,
  deleteParty
}; 