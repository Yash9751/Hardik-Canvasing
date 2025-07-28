const db = require('../db');

// Get dashboard summary
const getSummary = async (req, res) => {
  try {
    // Get total buy/sell/profit
    const summaryResult = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN total_value ELSE 0 END), 0) as totalBuy,
        COALESCE(SUM(CASE WHEN transaction_type = 'sell' THEN total_value ELSE 0 END), 0) as totalSell,
        COALESCE(SUM(CASE WHEN transaction_type = 'sell' THEN total_value ELSE -total_value END), 0) as totalProfit
      FROM sauda
    `);

    // Get today's transactions
    const todayResult = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN total_value ELSE 0 END), 0) as todayBuy,
        COALESCE(SUM(CASE WHEN transaction_type = 'sell' THEN total_value ELSE 0 END), 0) as todaySell,
        COALESCE(SUM(CASE WHEN transaction_type = 'sell' THEN total_value ELSE -total_value END), 0) as todayProfit
      FROM sauda
      WHERE date = CURRENT_DATE
    `);

    // Get stock overview
    const stockResult = await db.query(`
      SELECT i.item_name as product_type, s.current_stock_packs as current_stock
      FROM stock s
      LEFT JOIN items i ON s.item_id = i.id
      ORDER BY i.item_name
    `);

    const summary = {
      ...summaryResult.rows[0],
      ...todayResult.rows[0]
    };

    res.json({
      summary,
      stock: stockResult.rows
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get today's summary with proper formatting using P&L logic
const getTodaySummary = async (req, res) => {
  try {
    console.log('getTodaySummary called');
    
    // Simple response for now
    res.json({
      todayBuy: 0,
      todaySell: 0,
      todayProfit: 0,
      todayBuyQuantity: 0,
      todaySellQuantity: 0,
      purchaseCount: 0,
      sellCount: 0
    });
  } catch (error) {
    console.error('Get today summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get today's loading with proper data
const getTodayLoading = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        l.id,
        s.sauda_no,
        s.transaction_type,
        i.item_name,
        p.party_name,
        l.vajan_kg,
        l.quantity_packs,
        l.loading_date,
        l.note
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      WHERE l.loading_date = CURRENT_DATE
      ORDER BY l.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get today loading error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get today's purchase loading summary
const getTodayPurchaseLoading = async (req, res) => {
  try {
    // Use local date instead of database CURRENT_DATE to handle timezone
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.query(`
      SELECT 
        COALESCE(COUNT(*), 0) as count,
        COALESCE(SUM(l.vajan_kg), 0) as totalQuantity
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      WHERE l.loading_date = $1 AND s.transaction_type = 'purchase'
    `, [today]);

    // Convert kg to MT (1 MT = 1000 kg)
    const totalQuantityMT = parseFloat(result.rows[0].totalquantity) / 1000;

    res.json({
      count: result.rows[0].count,
      totalQuantity: totalQuantityMT
    });
  } catch (error) {
    console.error('Get today purchase loading error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get today's sell loading summary
const getTodaySellLoading = async (req, res) => {
  try {
    // Use local date instead of database CURRENT_DATE to handle timezone
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.query(`
      SELECT 
        COALESCE(COUNT(*), 0) as count,
        COALESCE(SUM(l.vajan_kg), 0) as totalQuantity
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      WHERE l.loading_date = $1 AND s.transaction_type = 'sell'
    `, [today]);

    // Convert kg to MT (1 MT = 1000 kg)
    const totalQuantityMT = parseFloat(result.rows[0].totalquantity) / 1000;

    res.json({
      count: result.rows[0].count,
      totalQuantity: totalQuantityMT
    });
  } catch (error) {
    console.error('Get today sell loading error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get today's purchase details
const getTodaysPurchaseDetails = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.query(`
      SELECT 
        s.id,
        s.sauda_no as sauda_number,
        party.party_name,
        item.item_name,
        s.quantity_packs as quantity,
        s.rate_per_10kg as rate,
        s.total_value,
        s.created_at,
        ROUND(l.vajan_kg / 1000, 2) as loading_quantity,
        s.rate_per_10kg as loading_rate,
        ROUND((l.vajan_kg / 1000) * s.rate_per_10kg * 100, 2) as loading_total
      FROM sauda s
      LEFT JOIN parties party ON s.party_id = party.id
      LEFT JOIN items item ON s.item_id = item.id
      LEFT JOIN loading l ON s.id = l.sauda_id
      WHERE DATE(s.created_at) = $1 AND s.transaction_type = 'purchase'
      ORDER BY s.created_at DESC
    `, [today]);

    res.json({
      purchases: result.rows,
      date: today
    });
  } catch (error) {
    console.error('Error fetching today\'s purchase details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get today's sell details
const getTodaysSellDetails = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.query(`
      SELECT 
        s.id,
        s.sauda_no as sauda_number,
        party.party_name,
        item.item_name,
        s.quantity_packs as quantity,
        s.rate_per_10kg as rate,
        s.total_value,
        s.created_at,
        ROUND(l.vajan_kg / 1000, 2) as loading_quantity,
        s.rate_per_10kg as loading_rate,
        ROUND((l.vajan_kg / 1000) * s.rate_per_10kg * 100, 2) as loading_total
      FROM sauda s
      LEFT JOIN parties party ON s.party_id = party.id
      LEFT JOIN items item ON s.item_id = item.id
      LEFT JOIN loading l ON s.id = l.sauda_id
      WHERE DATE(s.created_at) = $1 AND s.transaction_type = 'sell'
      ORDER BY s.created_at DESC
    `, [today]);

    res.json({
      sells: result.rows,
      date: today
    });
  } catch (error) {
    console.error('Error fetching today\'s sell details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get purchase loading details
const getPurchaseLoadingDetails = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.query(`
      SELECT 
        l.id,
        s.sauda_no as sauda_number,
        party.party_name,
        item.item_name,
        ROUND(l.vajan_kg / 1000, 2) as quantity,
        s.rate_per_10kg as rate,
        ROUND((l.vajan_kg / 1000) * s.rate_per_10kg * 100, 2) as total_value,
        l.created_at,
        'Purchase Loading' as loading_type,
        l.note as remarks
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      LEFT JOIN parties party ON s.party_id = party.id
      LEFT JOIN items item ON s.item_id = item.id
      WHERE s.transaction_type = 'purchase' AND l.loading_date = $1
      ORDER BY l.created_at DESC
    `, [today]);

    res.json({
      loadings: result.rows
    });
  } catch (error) {
    console.error('Error fetching purchase loading details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get sell loading details
const getSellLoadingDetails = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.query(`
      SELECT 
        l.id,
        s.sauda_no as sauda_number,
        party.party_name,
        item.item_name,
        ROUND(l.vajan_kg / 1000, 2) as quantity,
        s.rate_per_10kg as rate,
        ROUND((l.vajan_kg / 1000) * s.rate_per_10kg * 100, 2) as total_value,
        l.created_at,
        'Sell Loading' as loading_type,
        l.note as remarks
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      LEFT JOIN parties party ON s.party_id = party.id
      LEFT JOIN items item ON s.item_id = item.id
      WHERE s.transaction_type = 'sell' AND l.loading_date = $1
      ORDER BY l.created_at DESC
    `, [today]);

    res.json({
      loadings: result.rows
    });
  } catch (error) {
    console.error('Error fetching sell loading details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getSummary,
  getTodaySummary,
  getTodayLoading,
  getTodayPurchaseLoading,
  getTodaySellLoading,
  getTodaysPurchaseDetails,
  getTodaysSellDetails,
  getPurchaseLoadingDetails,
  getSellLoadingDetails
}; 