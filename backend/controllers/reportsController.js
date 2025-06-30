const db = require('../db');

// Get all trades report
const getAllTrades = async (req, res) => {
  try {
    const { start_date, end_date, include_zero = true } = req.query;
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

    if (start_date) {
      params.push(start_date);
      query += ` AND s.date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND s.date <= $${params.length}`;
    }

    if (include_zero === 'false') {
      query += ' AND s.pending_quantity_packs = 0';
    }

    query += ' ORDER BY s.date DESC, s.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting all trades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pending trades report
const getPendingTrades = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name
      FROM sauda s
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      WHERE s.pending_quantity_packs > 0
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND s.date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND s.date <= $${params.length}`;
    }

    query += ' ORDER BY s.date ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting pending trades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get overdue trades report
const getOverdueTrades = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name
      FROM sauda s
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      WHERE s.loading_due_date < CURRENT_DATE AND s.pending_quantity_packs > 0
      ORDER BY s.loading_due_date ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting overdue trades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get stock-wise report
const getStockWiseReport = async (req, res) => {
  try {
    const { transaction_type, item_ids, ex_plant_ids } = req.query;
    let query = `
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name
      FROM sauda s
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      WHERE 1=1
    `;
    const params = [];

    if (transaction_type) {
      params.push(transaction_type);
      query += ` AND s.transaction_type = $${params.length}`;
    }

    if (item_ids) {
      const itemIdArray = item_ids.split(',');
      const placeholders = itemIdArray.map((_, index) => `$${params.length + index + 1}`).join(',');
      query += ` AND s.item_id IN (${placeholders})`;
      params.push(...itemIdArray);
    }

    if (ex_plant_ids) {
      const exPlantIdArray = ex_plant_ids.split(',');
      const placeholders = exPlantIdArray.map((_, index) => `$${params.length + index + 1}`).join(',');
      query += ` AND s.ex_plant_id IN (${placeholders})`;
      params.push(...exPlantIdArray);
    }

    query += ' ORDER BY i.item_name, ep.plant_name, s.date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting stock-wise report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get party-wise report
const getPartyWiseReport = async (req, res) => {
  try {
    const { transaction_type, party_id, item_ids } = req.query;
    let query = `
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name
      FROM sauda s
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      WHERE 1=1
    `;
    const params = [];

    if (transaction_type) {
      params.push(transaction_type);
      query += ` AND s.transaction_type = $${params.length}`;
    }

    if (party_id) {
      params.push(party_id);
      query += ` AND s.party_id = $${params.length}`;
    }

    if (item_ids) {
      const itemIdArray = item_ids.split(',');
      const placeholders = itemIdArray.map((_, index) => `$${params.length + index + 1}`).join(',');
      query += ` AND s.item_id IN (${placeholders})`;
      params.push(...itemIdArray);
    }

    query += ' ORDER BY p.party_name, s.date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting party-wise report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllTrades,
  getPendingTrades,
  getOverdueTrades,
  getStockWiseReport,
  getPartyWiseReport
}; 