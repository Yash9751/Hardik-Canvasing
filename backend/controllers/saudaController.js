const db = require('../db');

// Generate sauda number with financial year prefix
const generateSaudaNumber = async () => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 0-indexed to 1-indexed
    
    // Financial year logic: April to March
    let financialYear;
    if (currentMonth >= 4) {
      // April onwards - current year to next year
      financialYear = `${currentYear}${(currentYear + 1).toString().slice(-2)}`;
    } else {
      // January to March - previous year to current year
      financialYear = `${currentYear - 1}${currentYear.toString().slice(-2)}`;
    }
    
    const prefix = financialYear;
    
    // Get the last sauda number for this financial year
    const lastSaudaResult = await db.query(
      `SELECT sauda_no FROM sauda 
       WHERE sauda_no LIKE $1 
       ORDER BY sauda_no DESC 
       LIMIT 1`,
      [`${prefix}/%`]
    );
    
    let nextNumber = 1;
    if (lastSaudaResult.rows.length > 0) {
      const lastSaudaNo = lastSaudaResult.rows[0].sauda_no;
      const lastNumber = parseInt(lastSaudaNo.split('/')[1]);
      nextNumber = lastNumber + 1;
    }
    
    return `${prefix}/${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating sauda number:', error);
    throw error;
  }
};

// Get all sauda transactions
const getAllSauda = async (req, res) => {
  try {
    const { transaction_type, item_id, party_id, date } = req.query;
    let query = `
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name, b.broker_name,
             dc.condition_name as delivery_condition, pc.condition_name as payment_condition
      FROM sauda s
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      LEFT JOIN brokers b ON s.broker_id = b.id
      LEFT JOIN delivery_conditions dc ON s.delivery_condition_id = dc.id
      LEFT JOIN payment_conditions pc ON s.payment_condition_id = pc.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (transaction_type) {
      paramCount++;
      query += ` AND s.transaction_type = $${paramCount}`;
      params.push(transaction_type);
    }

    if (item_id) {
      paramCount++;
      query += ` AND s.item_id = $${paramCount}`;
      params.push(item_id);
    }

    if (party_id) {
      paramCount++;
      query += ` AND s.party_id = $${paramCount}`;
      params.push(party_id);
    }

    if (date) {
      paramCount++;
      query += ` AND s.date = $${paramCount}`;
      params.push(date);
    }

    query += ' ORDER BY s.date DESC, s.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting sauda:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get sauda by ID
const getSaudaById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name, b.broker_name,
             dc.condition_name as delivery_condition, pc.condition_name as payment_condition
      FROM sauda s
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      LEFT JOIN brokers b ON s.broker_id = b.id
      LEFT JOIN delivery_conditions dc ON s.delivery_condition_id = dc.id
      LEFT JOIN payment_conditions pc ON s.payment_condition_id = pc.id
      WHERE s.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sauda not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting sauda:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new sauda
const createSauda = async (req, res) => {
  try {
    const {
      sauda_no,
      transaction_type,
      date,
      party_id,
      item_id,
      quantity_packs,
      rate_per_10kg,
      delivery_condition_id,
      payment_condition_id,
      loading_due_date,
      ex_plant_id,
      broker_id
    } = req.body;

    if (!transaction_type || !date || !party_id || !item_id || !quantity_packs || !rate_per_10kg) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    // Generate sauda number if not provided
    const finalSaudaNo = sauda_no || await generateSaudaNumber();

    const result = await db.query(
      `INSERT INTO sauda (
        sauda_no, transaction_type, date, party_id, item_id, quantity_packs, rate_per_10kg,
        delivery_condition_id, payment_condition_id, loading_due_date, ex_plant_id, broker_id,
        pending_quantity_packs
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $6) RETURNING *`,
      [finalSaudaNo, transaction_type, date, party_id, item_id, quantity_packs, rate_per_10kg,
       delivery_condition_id, payment_condition_id, loading_due_date, ex_plant_id, broker_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sauda:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Sauda number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update sauda
const updateSauda = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sauda_no,
      transaction_type,
      date,
      party_id,
      item_id,
      quantity_packs,
      rate_per_10kg,
      delivery_condition_id,
      payment_condition_id,
      loading_due_date,
      ex_plant_id,
      broker_id
    } = req.body;

    const result = await db.query(
      `UPDATE sauda SET 
        sauda_no = $1, transaction_type = $2, date = $3, party_id = $4, item_id = $5,
        quantity_packs = $6, rate_per_10kg = $7, delivery_condition_id = $8, payment_condition_id = $9,
        loading_due_date = $10, ex_plant_id = $11, broker_id = $12
       WHERE id = $13 RETURNING *`,
      [sauda_no, transaction_type, date, party_id, item_id, quantity_packs, rate_per_10kg,
       delivery_condition_id, payment_condition_id, loading_due_date, ex_plant_id, broker_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sauda not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating sauda:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Sauda number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete sauda
const deleteSauda = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM sauda WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sauda not found' });
    }
    
    res.json({ message: 'Sauda deleted successfully' });
  } catch (error) {
    console.error('Error deleting sauda:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pending sauda
const getPendingSauda = async (req, res) => {
  try {
    const { transaction_type, item_id } = req.query;
    let query = `
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name
      FROM sauda s
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      WHERE s.pending_quantity_packs > 0
    `;
    const params = [];

    if (transaction_type) {
      query += ' AND s.transaction_type = $1';
      params.push(transaction_type);
    }

    if (item_id) {
      const paramIndex = params.length + 1;
      query += ` AND s.item_id = $${paramIndex}`;
      params.push(item_id);
    }

    query += ' ORDER BY s.date ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting pending sauda:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get next sauda number
const getNextSaudaNumber = async (req, res) => {
  try {
    const saudaNumber = await generateSaudaNumber();
    res.json({ sauda_no: saudaNumber });
  } catch (error) {
    console.error('Error getting next sauda number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllSauda,
  getSaudaById,
  createSauda,
  updateSauda,
  deleteSauda,
  getPendingSauda,
  getNextSaudaNumber
}; 