const db = require('../db');

// Get all stock
const getAllStock = async (req, res) => {
  try {
    const { include_zero = true } = req.query;
    let query = `
      SELECT s.*, i.item_name, ep.plant_name as ex_plant_name
      FROM stock s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
    `;
    
    if (include_zero === 'false') {
      query += ' WHERE s.current_stock_packs > 0 OR s.pending_purchase_loading > 0 OR s.pending_sell_loading > 0';
    }
    
    query += ' ORDER BY i.item_name, ep.plant_name';

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get stock by item
const getStockByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { ex_plant_id } = req.query;
    
    let query = `
      SELECT s.*, i.item_name, ep.plant_name as ex_plant_name
      FROM stock s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      WHERE s.item_id = $1
    `;
    const params = [itemId];

    if (ex_plant_id) {
      query += ' AND s.ex_plant_id = $2';
      params.push(ex_plant_id);
    }

    query += ' ORDER BY ep.plant_name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting stock by item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get stock by ex plant
const getStockByExPlant = async (req, res) => {
  try {
    const { exPlantId } = req.params;
    const result = await db.query(`
      SELECT s.*, i.item_name, ep.plant_name as ex_plant_name
      FROM stock s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      WHERE s.ex_plant_id = $1
      ORDER BY i.item_name
    `, [exPlantId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting stock by ex plant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get stock summary
const getStockSummary = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        SUM(total_purchase_packs) as total_purchase,
        SUM(total_sell_packs) as total_sell,
        SUM(total_purchase_packs - total_sell_packs) as net_purchase,
        SUM(pending_purchase_loading) as pending_purchase_loading,
        SUM(pending_sell_loading) as pending_sell_loading
      FROM stock
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting stock summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllStock,
  getStockByItem,
  getStockByExPlant,
  getStockSummary
}; 