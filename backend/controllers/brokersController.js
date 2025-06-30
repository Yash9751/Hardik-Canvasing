const db = require('../db');

// Get all brokers
const getAllBrokers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM brokers ORDER BY broker_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting brokers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get broker by ID
const getBrokerById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM brokers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Broker not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting broker:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new broker
const createBroker = async (req, res) => {
  try {
    const { broker_name } = req.body;

    if (!broker_name) {
      return res.status(400).json({ error: 'Broker name is required' });
    }

    const result = await db.query(
      'INSERT INTO brokers (broker_name) VALUES ($1) RETURNING *',
      [broker_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating broker:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Broker name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update broker
const updateBroker = async (req, res) => {
  try {
    const { id } = req.params;
    const { broker_name } = req.body;

    const result = await db.query(
      'UPDATE brokers SET broker_name = $1 WHERE id = $2 RETURNING *',
      [broker_name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating broker:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Broker name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete broker
const deleteBroker = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM brokers WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Broker not found' });
    }
    
    res.json({ message: 'Broker deleted successfully' });
  } catch (error) {
    console.error('Error deleting broker:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllBrokers,
  getBrokerById,
  createBroker,
  updateBroker,
  deleteBroker
}; 