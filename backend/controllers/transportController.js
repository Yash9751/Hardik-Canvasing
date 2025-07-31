const db = require('../db');

// Get all transports
const getAllTransports = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM transports ORDER BY transport_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting transports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get transport by ID
const getTransportById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM transports WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transport not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting transport:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new transport
const createTransport = async (req, res) => {
  try {
    const { transport_name } = req.body;

    if (!transport_name) {
      return res.status(400).json({ error: 'Transport name is required' });
    }

    const result = await db.query(
      'INSERT INTO transports (transport_name) VALUES ($1) RETURNING *',
      [transport_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating transport:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Transport name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update transport
const updateTransport = async (req, res) => {
  try {
    const { id } = req.params;
    const { transport_name } = req.body;

    const result = await db.query(
      'UPDATE transports SET transport_name = $1 WHERE id = $2 RETURNING *',
      [transport_name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transport not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating transport:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Transport name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete transport
const deleteTransport = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM transports WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transport not found' });
    }
    
    res.json({ message: 'Transport deleted successfully' });
  } catch (error) {
    console.error('Error deleting transport:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllTransports,
  getTransportById,
  createTransport,
  updateTransport,
  deleteTransport
}; 