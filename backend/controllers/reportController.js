const pool = require('../db');

const getProductReport = async (req, res) => {
  try {
    const { product_type, start_date, end_date } = req.query;
    
    let buyQuery = `
      SELECT 
        date,
        party,
        broker,
        ex_plant,
        pack,
        rate,
        buy_value
      FROM buy 
      WHERE 1=1
    `;
    let sellQuery = `
      SELECT 
        date,
        party,
        ex_plant,
        pack,
        rate,
        sale_value
      FROM sell 
      WHERE 1=1
    `;
    let params = [];

    if (product_type) {
      buyQuery += ` AND product_type = $${params.length + 1}`;
      sellQuery += ` AND product_type = $${params.length + 1}`;
      params.push(product_type);
    }

    if (start_date) {
      buyQuery += ` AND date >= $${params.length + 1}`;
      sellQuery += ` AND date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      buyQuery += ` AND date <= $${params.length + 1}`;
      sellQuery += ` AND date <= $${params.length + 1}`;
      params.push(end_date);
    }

    buyQuery += ' ORDER BY date DESC, created_at DESC';
    sellQuery += ' ORDER BY date DESC, created_at DESC';

    const buyResult = await pool.query(buyQuery, params);
    const sellResult = await pool.query(sellQuery, params);

    // Calculate totals
    const buyTotal = buyResult.rows.reduce((sum, row) => sum + parseFloat(row.buy_value), 0);
    const sellTotal = sellResult.rows.reduce((sum, row) => sum + parseFloat(row.sale_value), 0);
    const profit = sellTotal - buyTotal;

    res.json({
      product_type: product_type || 'All',
      period: { start_date, end_date },
      summary: {
        total_buy: buyTotal,
        total_sell: sellTotal,
        profit: profit
      },
      buy_transactions: buyResult.rows,
      sell_transactions: sellResult.rows
    });
  } catch (error) {
    console.error('Get product report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getPartyReport = async (req, res) => {
  try {
    const { party, start_date, end_date } = req.query;
    
    let buyQuery = `
      SELECT 
        date,
        product_type,
        broker,
        ex_plant,
        pack,
        rate,
        buy_value
      FROM buy 
      WHERE party ILIKE $1
    `;
    let sellQuery = `
      SELECT 
        date,
        product_type,
        ex_plant,
        pack,
        rate,
        sale_value
      FROM sell 
      WHERE party ILIKE $1
    `;
    let params = [`%${party}%`];

    if (start_date) {
      buyQuery += ` AND date >= $${params.length + 1}`;
      sellQuery += ` AND date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      buyQuery += ` AND date <= $${params.length + 1}`;
      sellQuery += ` AND date <= $${params.length + 1}`;
      params.push(end_date);
    }

    buyQuery += ' ORDER BY date DESC, created_at DESC';
    sellQuery += ' ORDER BY date DESC, created_at DESC';

    const buyResult = await pool.query(buyQuery, params);
    const sellResult = await pool.query(sellQuery, params);

    // Calculate totals
    const buyTotal = buyResult.rows.reduce((sum, row) => sum + parseFloat(row.buy_value), 0);
    const sellTotal = sellResult.rows.reduce((sum, row) => sum + parseFloat(row.sale_value), 0);
    const profit = sellTotal - buyTotal;

    res.json({
      party: party,
      period: { start_date, end_date },
      summary: {
        total_buy: buyTotal,
        total_sell: sellTotal,
        profit: profit
      },
      buy_transactions: buyResult.rows,
      sell_transactions: sellResult.rows
    });
  } catch (error) {
    console.error('Get party report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getDateRangeReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const buyQuery = `
      SELECT 
        date,
        product_type,
        party,
        broker,
        ex_plant,
        pack,
        rate,
        buy_value
      FROM buy 
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC, created_at DESC
    `;
    const sellQuery = `
      SELECT 
        date,
        product_type,
        party,
        ex_plant,
        pack,
        rate,
        sale_value
      FROM sell 
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC, created_at DESC
    `;

    const buyResult = await pool.query(buyQuery, [start_date, end_date]);
    const sellResult = await pool.query(sellQuery, [start_date, end_date]);

    // Calculate totals
    const buyTotal = buyResult.rows.reduce((sum, row) => sum + parseFloat(row.buy_value), 0);
    const sellTotal = sellResult.rows.reduce((sum, row) => sum + parseFloat(row.sale_value), 0);
    const profit = sellTotal - buyTotal;

    // Group by product type
    const productSummary = {};
    ['Palm', 'Rice', 'Mustard'].forEach(product => {
      const productBuys = buyResult.rows.filter(row => row.product_type === product);
      const productSells = sellResult.rows.filter(row => row.product_type === product);
      
      const productBuyTotal = productBuys.reduce((sum, row) => sum + parseFloat(row.buy_value), 0);
      const productSellTotal = productSells.reduce((sum, row) => sum + parseFloat(row.sale_value), 0);
      
      productSummary[product] = {
        buy_total: productBuyTotal,
        sell_total: productSellTotal,
        profit: productSellTotal - productBuyTotal,
        buy_count: productBuys.length,
        sell_count: productSells.length
      };
    });

    res.json({
      period: { start_date, end_date },
      summary: {
        total_buy: buyTotal,
        total_sell: sellTotal,
        profit: profit
      },
      product_summary: productSummary,
      buy_transactions: buyResult.rows,
      sell_transactions: sellResult.rows
    });
  } catch (error) {
    console.error('Get date range report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getProductReport,
  getPartyReport,
  getDateRangeReport
}; 