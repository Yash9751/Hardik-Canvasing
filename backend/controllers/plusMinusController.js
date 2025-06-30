const db = require('../db');

const getDailyPlusMinus = async (req, res) => {
  try {
    const { date, item_id } = req.query;
    
    let query = `
      SELECT 
        pm.date,
        pm.item_id,
        i.item_name,
        pm.buy_total,
        pm.sell_total,
        pm.profit
      FROM plus_minus pm
      LEFT JOIN items i ON pm.item_id = i.id
      WHERE 1=1
    `;
    let params = [];

    if (date) {
      query += ` AND pm.date = $${params.length + 1}`;
      params.push(date);
    }

    if (item_id) {
      query += ` AND pm.item_id = $${params.length + 1}`;
      params.push(item_id);
    }

    query += ' ORDER BY pm.date DESC, i.item_name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get daily plus minus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const generateDailyPlusMinus = async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // Calculate buy and sell totals for each item for the given date
    const buyQuery = `
      SELECT 
        s.item_id,
        i.item_name,
        SUM(s.total_value) as total_buy
      FROM sauda s
      LEFT JOIN items i ON s.item_id = i.id
      WHERE s.date = $1 AND s.transaction_type = 'purchase'
      GROUP BY s.item_id, i.item_name
    `;
    const sellQuery = `
      SELECT 
        s.item_id,
        i.item_name,
        SUM(s.total_value) as total_sell
      FROM sauda s
      LEFT JOIN items i ON s.item_id = i.id
      WHERE s.date = $1 AND s.transaction_type = 'sell'
      GROUP BY s.item_id, i.item_name
    `;

    const buyResult = await db.query(buyQuery, [date]);
    const sellResult = await db.query(sellQuery, [date]);

    // Create a map of item totals
    const buyMap = {};
    const sellMap = {};

    buyResult.rows.forEach(row => {
      buyMap[row.item_id] = {
        item_name: row.item_name,
        total: parseFloat(row.total_buy)
      };
    });

    sellResult.rows.forEach(row => {
      sellMap[row.item_id] = {
        item_name: row.item_name,
        total: parseFloat(row.total_sell)
      };
    });

    // Get all unique items
    const allItems = new Set([
      ...Object.keys(buyMap),
      ...Object.keys(sellMap)
    ]);

    // Insert or update plus_minus records for each item
    const upsertQuery = `
      INSERT INTO plus_minus (date, item_id, buy_total, sell_total)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (date, item_id)
      DO UPDATE SET 
        buy_total = EXCLUDED.buy_total,
        sell_total = EXCLUDED.sell_total,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const results = [];
    for (const itemId of allItems) {
      const buyTotal = buyMap[itemId]?.total || 0;
      const sellTotal = sellMap[itemId]?.total || 0;
      
      const result = await db.query(upsertQuery, [date, itemId, buyTotal, sellTotal]);
      results.push(result.rows[0]);
    }

    res.json({
      message: 'Daily plus minus generated successfully',
      data: results
    });
  } catch (error) {
    console.error('Generate daily plus minus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getPlusMinusSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        pm.item_id,
        i.item_name,
        SUM(pm.buy_total) as total_buy,
        SUM(pm.sell_total) as total_sell,
        SUM(pm.profit) as total_profit
      FROM plus_minus pm
      LEFT JOIN items i ON pm.item_id = i.id
      WHERE 1=1
    `;
    let params = [];

    if (start_date) {
      query += ` AND pm.date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND pm.date <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ' GROUP BY pm.item_id, i.item_name ORDER BY i.item_name';

    const result = await db.query(query, params);

    // Calculate overall totals
    const overallTotals = result.rows.reduce((acc, row) => {
      acc.totalBuy += parseFloat(row.total_buy);
      acc.totalSell += parseFloat(row.total_sell);
      acc.totalProfit += parseFloat(row.total_profit);
      return acc;
    }, { totalBuy: 0, totalSell: 0, totalProfit: 0 });

    res.json({
      period: { start_date, end_date },
      item_summary: result.rows,
      overall_summary: overallTotals
    });
  } catch (error) {
    console.error('Get plus minus summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getTodayPlusMinus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        pm.item_id,
        i.item_name,
        pm.buy_total,
        pm.sell_total,
        pm.profit
      FROM plus_minus pm
      LEFT JOIN items i ON pm.item_id = i.id
      WHERE pm.date = $1
      ORDER BY i.item_name
    `;

    const result = await db.query(query, [today]);

    // Calculate totals
    const totals = result.rows.reduce((acc, row) => {
      acc.totalBuy += parseFloat(row.buy_total);
      acc.totalSell += parseFloat(row.sell_total);
      acc.totalProfit += parseFloat(row.profit);
      return acc;
    }, { totalBuy: 0, totalSell: 0, totalProfit: 0 });

    res.json({
      date: today,
      items: result.rows,
      totals
    });
  } catch (error) {
    console.error('Get today plus minus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDailyPlusMinus,
  generateDailyPlusMinus,
  getPlusMinusSummary,
  getTodayPlusMinus
}; 