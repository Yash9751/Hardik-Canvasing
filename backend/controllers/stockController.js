const db = require('../db');

// Utility: Recalculate and upsert stock for a given item_id and ex_plant_id
async function recalculateStock(item_id, ex_plant_id) {
  // Calculate total purchase and sell packs from sauda
  const purchaseRes = await db.query(
    `SELECT COALESCE(SUM(quantity_packs),0) as total
     FROM sauda WHERE transaction_type='purchase' AND item_id=$1 AND ex_plant_id=$2`,
    [item_id, ex_plant_id]
  );
  const sellRes = await db.query(
    `SELECT COALESCE(SUM(quantity_packs),0) as total
     FROM sauda WHERE transaction_type='sell' AND item_id=$1 AND ex_plant_id=$2`,
    [item_id, ex_plant_id]
  );
  // Calculate loaded purchase and sell packs from loading
  const loadedPurchaseRes = await db.query(
    `SELECT COALESCE(SUM(l.quantity_packs),0) as total
     FROM loading l
     JOIN sauda s ON l.sauda_id = s.id
     WHERE s.transaction_type='purchase' AND s.item_id=$1 AND s.ex_plant_id=$2`,
    [item_id, ex_plant_id]
  );
  const loadedSellRes = await db.query(
    `SELECT COALESCE(SUM(l.quantity_packs),0) as total
     FROM loading l
     JOIN sauda s ON l.sauda_id = s.id
     WHERE s.transaction_type='sell' AND s.item_id=$1 AND s.ex_plant_id=$2`,
    [item_id, ex_plant_id]
  );
  const total_purchase_packs = parseInt(purchaseRes.rows[0].total, 10);
  const total_sell_packs = parseInt(sellRes.rows[0].total, 10);
  const loaded_purchase_packs = parseInt(loadedPurchaseRes.rows[0].total, 10);
  const loaded_sell_packs = parseInt(loadedSellRes.rows[0].total, 10);
  console.log('[recalculateStock] item_id:', item_id, 'ex_plant_id:', ex_plant_id, 'total_purchase_packs:', total_purchase_packs, 'total_sell_packs:', total_sell_packs, 'loaded_purchase_packs:', loaded_purchase_packs, 'loaded_sell_packs:', loaded_sell_packs);
  // Upsert into stock table
  await db.query(
    `INSERT INTO stock (item_id, ex_plant_id, total_purchase_packs, total_sell_packs, loaded_purchase_packs, loaded_sell_packs, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (item_id, ex_plant_id)
     DO UPDATE SET total_purchase_packs=$3, total_sell_packs=$4, loaded_purchase_packs=$5, loaded_sell_packs=$6, updated_at=NOW()`,
    [item_id, ex_plant_id, total_purchase_packs, total_sell_packs, loaded_purchase_packs, loaded_sell_packs]
  );
}

// Get all stock
const getAllStock = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT s.*, i.item_name, ep.plant_name as ex_plant_name
      FROM stock s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
    `;
    if (status === 'pending') {
      query += ' WHERE s.pending_purchase_loading > 0 OR s.pending_sell_loading > 0';
    }
    // No filter for 'with 0' (status not provided): show all rows
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
        COALESCE(SUM(total_purchase_packs), 0) as total_purchase,
        COALESCE(SUM(total_sell_packs), 0) as total_sell,
        COALESCE(SUM(total_purchase_packs - total_sell_packs), 0) as net_purchase,
        COALESCE(SUM(pending_purchase_loading), 0) as pending_purchase_loading,
        COALESCE(SUM(pending_sell_loading), 0) as pending_sell_loading
      FROM stock
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting stock summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// TEMP DEBUG: Get all raw stock rows
const getRawStock = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM stock');
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting raw stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get stock with party-wise breakdown
const getStockWithPartyBreakdown = async (req, res) => {
  try {
    const { status } = req.query;
    
    // First, get the main stock data grouped by item and ex-plant
    let stockQuery = `
      SELECT s.*, i.item_name, ep.plant_name as ex_plant_name
      FROM stock s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
    `;
    
    if (status === 'pending') {
      stockQuery += ' WHERE s.pending_purchase_loading > 0 OR s.pending_sell_loading > 0';
    }
    
    stockQuery += ' ORDER BY i.item_name, ep.plant_name';
    const stockResult = await db.query(stockQuery);
    
    // For each stock item, get party-wise breakdown
    const stockWithBreakdown = await Promise.all(
      stockResult.rows.map(async (stockItem) => {
        // Get party-wise purchase breakdown
        const purchaseBreakdown = await db.query(`
          SELECT 
            p.party_name,
            COALESCE(SUM(s.quantity_packs), 0) as buy_packs,
            COALESCE(SUM(s.quantity_packs * s.rate_per_10kg * 100), 0) as buy_value,
            COALESCE(SUM(l.quantity_packs), 0) as loaded_packs,
            COALESCE(SUM(l.quantity_packs * s.rate_per_10kg * 100), 0) as loaded_value,
            COALESCE(AVG(s.rate_per_10kg), 0) as avg_buy_rate
          FROM sauda s
          LEFT JOIN parties p ON s.party_id = p.id
          LEFT JOIN loading l ON l.sauda_id = s.id
          WHERE s.transaction_type = 'purchase' 
            AND s.item_id = $1 
            AND s.ex_plant_id = $2
          GROUP BY p.id, p.party_name
          ORDER BY p.party_name
        `, [stockItem.item_id, stockItem.ex_plant_id]);
        
        // Get party-wise sell breakdown
        const sellBreakdown = await db.query(`
          SELECT 
            p.party_name,
            COALESCE(SUM(s.quantity_packs), 0) as sell_packs,
            COALESCE(SUM(s.quantity_packs * s.rate_per_10kg * 100), 0) as sell_value,
            COALESCE(SUM(l.quantity_packs), 0) as loaded_packs,
            COALESCE(SUM(l.quantity_packs * s.rate_per_10kg * 100), 0) as loaded_value,
            COALESCE(AVG(s.rate_per_10kg), 0) as avg_sell_rate
          FROM sauda s
          LEFT JOIN parties p ON s.party_id = p.id
          LEFT JOIN loading l ON l.sauda_id = s.id
          WHERE s.transaction_type = 'sell' 
            AND s.item_id = $1 
            AND s.ex_plant_id = $2
          GROUP BY p.id, p.party_name
          ORDER BY p.party_name
        `, [stockItem.item_id, stockItem.ex_plant_id]);
        
        // Combine purchase and sell data by party
        const partyBreakdown = [];
        const partyMap = new Map();
        
        // Add purchase data
        purchaseBreakdown.rows.forEach(row => {
          partyMap.set(row.party_name, {
            party_name: row.party_name,
            buy_packs: parseInt(row.buy_packs) || 0,
            buy_value: parseFloat(row.buy_value) || 0,
            buy_loaded_packs: parseInt(row.loaded_packs) || 0,
            buy_loaded_value: parseFloat(row.loaded_value) || 0,
            avg_buy_rate: parseFloat(row.avg_buy_rate) || 0,
            sell_packs: 0,
            sell_value: 0,
            sell_loaded_packs: 0,
            sell_loaded_value: 0,
            avg_sell_rate: 0
          });
        });
        
        // Add sell data
        sellBreakdown.rows.forEach(row => {
          if (partyMap.has(row.party_name)) {
            const party = partyMap.get(row.party_name);
            party.sell_packs = parseInt(row.sell_packs) || 0;
            party.sell_value = parseFloat(row.sell_value) || 0;
            party.sell_loaded_packs = parseInt(row.loaded_packs) || 0;
            party.sell_loaded_value = parseFloat(row.loaded_value) || 0;
            party.avg_sell_rate = parseFloat(row.avg_sell_rate) || 0;
          } else {
            partyMap.set(row.party_name, {
              party_name: row.party_name,
              buy_packs: 0,
              buy_value: 0,
              buy_loaded_packs: 0,
              buy_loaded_value: 0,
              avg_buy_rate: 0,
              sell_packs: parseInt(row.sell_packs) || 0,
              sell_value: parseFloat(row.sell_value) || 0,
              sell_loaded_packs: parseInt(row.loaded_packs) || 0,
              sell_loaded_value: parseFloat(row.loaded_value) || 0,
              avg_sell_rate: parseFloat(row.avg_sell_rate) || 0
            });
          }
        });
        
        // Convert map to array and calculate net values
        partyMap.forEach(party => {
          party.net_packs = party.buy_packs - party.sell_packs;
          party.net_value = party.buy_value - party.sell_value;
          party.pending_buy_packs = party.buy_packs - party.buy_loaded_packs;
          party.pending_sell_packs = party.sell_packs - party.sell_loaded_packs;
          partyBreakdown.push(party);
        });
        
        return {
          ...stockItem,
          party_breakdown: partyBreakdown
        };
      })
    );
    
    res.json(stockWithBreakdown);
  } catch (error) {
    console.error('Error getting stock with party breakdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Recalculate all stock (utility endpoint)
const recalculateAllStock = async (req, res) => {
  try {
    // Clear the stock table
    await db.query('DELETE FROM stock');
    // Get all unique item_id and ex_plant_id from sauda
    const result = await db.query('SELECT DISTINCT item_id, ex_plant_id FROM sauda');
    for (const row of result.rows) {
      await recalculateStock(row.item_id, row.ex_plant_id);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error recalculating all stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllStock,
  getStockByItem,
  getStockByExPlant,
  getStockSummary,
  recalculateStock,
  getRawStock, // TEMP DEBUG
  getStockWithPartyBreakdown,
  recalculateAllStock
}; 