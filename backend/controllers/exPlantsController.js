const db = require('../db');

// Get all ex plants
const getAllExPlants = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ex_plants ORDER BY plant_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting ex plants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get ex plant by ID
const getExPlantById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM ex_plants WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ex plant not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting ex plant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new ex plant
const createExPlant = async (req, res) => {
  try {
    const { plant_name } = req.body;

    if (!plant_name) {
      return res.status(400).json({ error: 'Plant name is required' });
    }

    const result = await db.query(
      'INSERT INTO ex_plants (plant_name) VALUES ($1) RETURNING *',
      [plant_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ex plant:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Plant name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update ex plant
const updateExPlant = async (req, res) => {
  try {
    const { id } = req.params;
    const { plant_name } = req.body;

    const result = await db.query(
      'UPDATE ex_plants SET plant_name = $1 WHERE id = $2 RETURNING *',
      [plant_name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ex plant not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ex plant:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Plant name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete ex plant
const deleteExPlant = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM ex_plants WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ex plant not found' });
    }
    
    res.json({ message: 'Ex plant deleted successfully' });
  } catch (error) {
    console.error('Error deleting ex plant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllExPlants,
  getExPlantById,
  createExPlant,
  updateExPlant,
  deleteExPlant
}; 