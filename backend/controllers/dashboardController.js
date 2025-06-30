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

// Get today's summary with proper formatting
const getTodaySummary = async (req, res) => {
  try {
    // Get today's purchase summary
    const todayPurchaseResult = await db.query(`
      SELECT 
        COALESCE(SUM(total_value), 0) as todayBuy,
        COALESCE(COUNT(*), 0) as purchaseCount
      FROM sauda
      WHERE date = CURRENT_DATE AND transaction_type = 'purchase'
    `);

    // Get today's sell summary
    const todaySellResult = await db.query(`
      SELECT 
        COALESCE(SUM(total_value), 0) as todaySell,
        COALESCE(COUNT(*), 0) as sellCount
      FROM sauda
      WHERE date = CURRENT_DATE AND transaction_type = 'sell'
    `);

    const todayBuy = todayPurchaseResult.rows[0].todaybuy || 0;
    const todaySell = todaySellResult.rows[0].todaysell || 0;
    const todayProfit = todaySell - todayBuy;

    res.json({
      todayBuy: todayBuy.toString(),
      todaySell: todaySell.toString(),
      todayProfit: todayProfit.toString(),
      purchaseCount: todayPurchaseResult.rows[0].purchasecount || 0,
      sellCount: todaySellResult.rows[0].sellcount || 0
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
    const result = await db.query(`
      SELECT 
        COALESCE(COUNT(*), 0) as count,
        COALESCE(SUM(l.vajan_kg), 0) as totalVajan
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      WHERE l.loading_date = CURRENT_DATE AND s.transaction_type = 'purchase'
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get today purchase loading error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get today's sell loading summary
const getTodaySellLoading = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COALESCE(COUNT(*), 0) as count,
        COALESCE(SUM(l.vajan_kg), 0) as totalVajan
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      WHERE l.loading_date = CURRENT_DATE AND s.transaction_type = 'sell'
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get today sell loading error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getSummary,
  getTodaySummary,
  getTodayLoading,
  getTodayPurchaseLoading,
  getTodaySellLoading
}; 