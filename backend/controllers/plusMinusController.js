const db = require('../db');
const { retryDatabaseOperation } = require('../middleware/retryMiddleware');
const puppeteer = require('puppeteer');

const getDailyPlusMinus = async (req, res) => {
  try {
    const { date, item_id } = req.query;
    
    let query = `
      SELECT 
        pm.date,
        i.item_name,
        SUM(pm.buy_total) as buy_total,
        SUM(pm.sell_total) as sell_total,
        SUM(pm.buy_quantity * 1000) as buy_quantity_kg,
        SUM(pm.sell_quantity) as sell_quantity_packs,
        CASE 
          WHEN SUM(pm.buy_quantity * 1000) > 0 THEN 
            SUM(pm.buy_total) / SUM(pm.buy_quantity * 1000) * 10
          ELSE 0 
        END as avg_buy_rate,
        CASE 
          WHEN SUM(pm.sell_quantity * 1000) > 0 THEN 
            SUM(pm.sell_total) / SUM(pm.sell_quantity * 1000) * 10
          ELSE 0 
        END as avg_sell_rate
      FROM plus_minus pm
      LEFT JOIN items i ON pm.item_id = i.id
      WHERE 1=1
    `;
    let params = [];

    if (date) {
      query += ` AND pm.date::date = $${params.length + 1}`;
      params.push(date);
    }

    if (item_id) {
      query += ` AND pm.item_id = $${params.length + 1}`;
      params.push(item_id);
    }

    query += ' GROUP BY pm.date, i.item_name ORDER BY pm.date DESC, i.item_name';

    const result = await retryDatabaseOperation(() => db.query(query, params));
    
          // Calculate profit for each item
      const itemsWithProfit = result.rows.map(row => {
        const buyQuantityKg = parseFloat(row.buy_quantity_kg) || 0;
        const sellQuantityPacks = parseFloat(row.sell_quantity_packs) || 0;
        const sellQuantityKg = sellQuantityPacks * 1000; // Convert packs to kg for profit calculation
        const avgBuyRate = parseFloat(row.avg_buy_rate) || 0;
        const avgSellRate = parseFloat(row.avg_sell_rate) || 0;
        
        // Calculate profit using the same logic as in generatePlusMinusForDate
        let profit = 0;
        if (sellQuantityKg > 0) {
          const avgSellRatePerKg = avgSellRate / 10;
          const avgBuyRatePerKg = avgBuyRate / 10;
          profit = (avgSellRatePerKg - avgBuyRatePerKg) * sellQuantityKg;
        }
        
        return {
          ...row,
          buy_quantity: buyQuantityKg / 1000, // Convert back to MT for frontend
          sell_quantity: sellQuantityPacks * 1000, // Convert packs to kg (1 pack = 1000 kg)
          profit: profit
        };
      });
    
    res.json(itemsWithProfit);
  } catch (error) {
    console.error('Get daily plus minus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to generate P&L data for a specific date
const generatePlusMinusForDate = async (date) => {
  try {
    // Get all unique item+ex_plant combinations that have any buy or sell up to and including this date
    const itemsResult = await retryDatabaseOperation(() => db.query(`
      SELECT DISTINCT item_id, ex_plant_id FROM sauda WHERE date <= $1
    `, [date]));

    const upsertQuery = `
      INSERT INTO plus_minus (date, item_id, ex_plant_id, buy_total, sell_total, profit, buy_quantity, sell_quantity, avg_buy_rate, avg_sell_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (date, item_id, ex_plant_id)
      DO UPDATE SET 
        buy_total = EXCLUDED.buy_total,
        sell_total = EXCLUDED.sell_total,
        profit = EXCLUDED.profit,
        buy_quantity = EXCLUDED.buy_quantity,
        sell_quantity = EXCLUDED.sell_quantity,
        avg_buy_rate = EXCLUDED.avg_buy_rate,
        avg_sell_rate = EXCLUDED.avg_sell_rate,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const results = [];
    for (const row of itemsResult.rows) {
      const { item_id, ex_plant_id } = row;
      // Cumulative purchase up to and including this date
      const buyRes = await retryDatabaseOperation(() => db.query(
        `SELECT 
          COALESCE(SUM(quantity_packs),0) as total_quantity_packs,
          COALESCE(SUM(quantity_packs * 1000),0) as total_quantity_kg,
          COALESCE(SUM(total_value),0) as total_buy_value
        FROM sauda
        WHERE transaction_type = 'purchase' AND item_id = $1 AND ex_plant_id = $2 AND date <= $3`,
        [item_id, ex_plant_id, date]
      ));
      // Cumulative sell up to and including this date
      const sellRes = await retryDatabaseOperation(() => db.query(
        `SELECT 
          COALESCE(SUM(quantity_packs * 1000),0) as total_quantity_kg,
          COALESCE(SUM(quantity_packs),0) as total_quantity_packs,
          COALESCE(SUM(total_value),0) as total_sell_value
        FROM sauda
        WHERE transaction_type = 'sell' AND item_id = $1 AND ex_plant_id = $2 AND date <= $3`,
        [item_id, ex_plant_id, date]
      ));
      const buy = buyRes.rows[0];
      const sell = sellRes.rows[0];
      const buyTotal = parseFloat(buy.total_buy_value) || 0;
      const sellTotal = parseFloat(sell.total_sell_value) || 0;
      const buyQuantityPacks = parseFloat(buy.total_quantity_packs) || 0;
      const buyQuantityKg = parseFloat(buy.total_quantity_kg) || 0;
      const sellQuantityPacks = parseFloat(sell.total_quantity_packs) || 0;
      const sellQuantityKg = parseFloat(sell.total_quantity_kg) || 0;
      const avgBuyRate = buyQuantityKg > 0 ? buyTotal / buyQuantityKg * 10 : 0; // per 10kg
      const avgSellRate = sellQuantityPacks > 0 ? sellTotal / (sellQuantityPacks * 1000) * 10 : 0; // per 10kg
      // Calculate profit using cumulative avg buy price
      let profit = 0;
      if (sellQuantityKg > 0) {
        const avgSellRatePerKg = avgSellRate / 10;
        const avgBuyRatePerKg = avgBuyRate / 10;
        profit = (avgSellRatePerKg - avgBuyRatePerKg) * sellQuantityKg;
      }
      const result = await db.query(upsertQuery, [
        date,
        item_id,
        ex_plant_id,
        buyTotal,
        sellTotal,
        profit,
        buyQuantityPacks,
        sellQuantityPacks,
        avgBuyRate,
        avgSellRate
      ]);
      results.push(result.rows[0]);
    }
    return results;
  } catch (error) {
    console.error('Generate plus minus for date error:', error);
    throw error;
  }
};

const generateDailyPlusMinus = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const results = await generatePlusMinusForDate(date);

    res.json({
      message: 'Daily plus minus generated successfully with cumulative average buying price',
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
        i.item_name,
        SUM(pm.buy_total) as buy_total,
        SUM(pm.sell_total) as sell_total,
        SUM(pm.buy_quantity * 1000) as buy_quantity_kg,
        SUM(pm.sell_quantity) as sell_quantity_packs,
        CASE 
          WHEN SUM(pm.buy_quantity * 1000) > 0 THEN 
            SUM(pm.buy_total) / SUM(pm.buy_quantity * 1000) * 10
          ELSE 0 
        END as avg_buy_rate,
        CASE 
          WHEN SUM(pm.sell_quantity * 1000) > 0 THEN 
            SUM(pm.sell_total) / SUM(pm.sell_quantity * 1000) * 10
          ELSE 0 
        END as avg_sell_rate
      FROM plus_minus pm
      LEFT JOIN items i ON pm.item_id = i.id
      WHERE pm.date = $1
      GROUP BY i.item_name
      ORDER BY i.item_name
    `;

    const result = await db.query(query, [today]);

    // Calculate profit for each item and totals
    const itemsWithProfit = result.rows.map(row => {
      const buyQuantityKg = parseFloat(row.buy_quantity_kg) || 0;
      const sellQuantityPacks = parseFloat(row.sell_quantity_packs) || 0;
      const sellQuantityKg = sellQuantityPacks * 1000; // Convert packs to kg for profit calculation
      const avgBuyRate = parseFloat(row.avg_buy_rate) || 0;
      const avgSellRate = parseFloat(row.avg_sell_rate) || 0;
      
              // Calculate profit using the same logic as in generatePlusMinusForDate
        let profit = 0;
        if (sellQuantityKg > 0) {
          const avgSellRatePerKg = avgSellRate / 10;
          const avgBuyRatePerKg = avgBuyRate / 10;
          profit = (avgSellRatePerKg - avgBuyRatePerKg) * sellQuantityKg;
        }
      
      return {
        ...row,
        buy_quantity: buyQuantityKg / 1000, // Convert back to MT for frontend
        sell_quantity: sellQuantityPacks * 1000, // Convert packs to kg (1 pack = 1000 kg)
        profit: profit
      };
    });

    const totals = itemsWithProfit.reduce((acc, row) => {
      acc.totalBuy += parseFloat(row.buy_total);
      acc.totalSell += parseFloat(row.sell_total);
      acc.totalProfit += parseFloat(row.profit);
      return acc;
    }, { totalBuy: 0, totalSell: 0, totalProfit: 0 });

    res.json({
      date: today,
      items: itemsWithProfit,
      totals
    });
  } catch (error) {
    console.error('Get today plus minus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Recalculate all plus_minus (utility endpoint)
const recalculateAllPlusMinus = async (req, res) => {
  try {
    // Clear the plus_minus table
    await db.query('DELETE FROM plus_minus');
    // Get all unique dates from sauda
    const result = await db.query('SELECT DISTINCT date FROM sauda ORDER BY date');
    for (const row of result.rows) {
      // Use the date directly without timezone conversion
      const dateStr = row.date.toISOString().split('T')[0];
      console.log('Recalculating for date:', dateStr, 'Original date:', row.date);
      // Use the same logic as generateDailyPlusMinus for each date
      await module.exports.generateDailyPlusMinus({ body: { date: dateStr } }, { json: () => {} });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error recalculating all plus_minus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Future P&L (pending loading trades)
const getFuturePlusMinus = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.item_name,
        i.nick_name,
        SUM(CASE WHEN s.transaction_type = 'purchase' THEN s.quantity_packs * s.rate_per_10kg * 100 ELSE 0 END) as buy_total,
        SUM(CASE WHEN s.transaction_type = 'sell' THEN s.quantity_packs * s.rate_per_10kg * 100 ELSE 0 END) as sell_total,
        SUM(CASE WHEN s.transaction_type = 'purchase' THEN s.quantity_packs ELSE 0 END) as buy_quantity_packs,
        SUM(CASE WHEN s.transaction_type = 'sell' THEN s.quantity_packs ELSE 0 END) as sell_quantity_packs,
        CASE 
          WHEN SUM(CASE WHEN s.transaction_type = 'purchase' THEN s.quantity_packs * 1000 ELSE 0 END) > 0 THEN 
            SUM(CASE WHEN s.transaction_type = 'purchase' THEN s.quantity_packs * s.rate_per_10kg * 100 ELSE 0 END) / SUM(CASE WHEN s.transaction_type = 'purchase' THEN s.quantity_packs * 1000 ELSE 0 END) * 10
          ELSE 0 
        END as avg_buy_rate,
        CASE 
          WHEN SUM(CASE WHEN s.transaction_type = 'sell' THEN s.quantity_packs * 1000 ELSE 0 END) > 0 THEN 
            SUM(CASE WHEN s.transaction_type = 'sell' THEN s.quantity_packs * s.rate_per_10kg * 100 ELSE 0 END) / SUM(CASE WHEN s.transaction_type = 'sell' THEN s.quantity_packs * 1000 ELSE 0 END) * 10
          ELSE 0 
        END as avg_sell_rate
      FROM sauda s
      LEFT JOIN items i ON s.item_id = i.id
      WHERE EXISTS (
        SELECT 1 FROM loading l 
        WHERE l.sauda_id = s.id 
        AND l.quantity_packs < s.quantity_packs
      )
      GROUP BY i.id, i.item_name, i.nick_name
      ORDER BY i.item_name
    `;

    const result = await retryDatabaseOperation(() => db.query(query));
    
    // Calculate profit for each item
    const itemsWithProfit = result.rows.map(row => {
      const buyQuantityPacks = parseFloat(row.buy_quantity_packs) || 0;
      const sellQuantityPacks = parseFloat(row.sell_quantity_packs) || 0;
      const buyQuantityKg = buyQuantityPacks * 1000;
      const sellQuantityKg = sellQuantityPacks * 1000;
      const avgBuyRate = parseFloat(row.avg_buy_rate) || 0;
      const avgSellRate = parseFloat(row.avg_sell_rate) || 0;
      
      // Calculate profit using the same logic as other P&L calculations
      let profit = 0;
      if (sellQuantityKg > 0) {
        const avgSellRatePerKg = avgSellRate / 10;
        const avgBuyRatePerKg = avgBuyRate / 10;
        profit = (avgSellRatePerKg - avgBuyRatePerKg) * sellQuantityKg;
      }
      
      return {
        ...row,
        buy_quantity: buyQuantityPacks, // Keep as packs (1 pack = 1 MT)
        sell_quantity: sellQuantityPacks * 1000, // Convert to kg for profit calculation
        profit: profit,
        product_type: row.nick_name || row.item_name // Use nickname if available
      };
    });
    
    res.json(itemsWithProfit);
  } catch (error) {
    console.error('Get future plus minus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper: Generate plus_minus for a given date, item, ex_plant
async function generatePlusMinusFor(date, item_id, ex_plant_id) {
  // This should match your existing logic for generating a plus_minus row
  // (You may need to adjust this to match your actual implementation)
  // Example:
  const buyRes = await db.query(
    `SELECT COALESCE(SUM(quantity_packs * rate_per_10kg * 100), 0) as buy_total
     FROM sauda WHERE transaction_type = 'purchase' AND date = $1 AND item_id = $2 AND ex_plant_id = $3`,
    [date, item_id, ex_plant_id]
  );
  const sellRes = await db.query(
    `SELECT COALESCE(SUM(quantity_packs * rate_per_10kg * 100), 0) as sell_total
     FROM sauda WHERE transaction_type = 'sell' AND date = $1 AND item_id = $2 AND ex_plant_id = $3`,
    [date, item_id, ex_plant_id]
  );
  const buy_total = parseFloat(buyRes.rows[0].buy_total);
  const sell_total = parseFloat(sellRes.rows[0].sell_total);
  await db.query(
    `INSERT INTO plus_minus (date, item_id, ex_plant_id, buy_total, sell_total)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (date, item_id, ex_plant_id) DO UPDATE SET buy_total = $4, sell_total = $5`,
    [date, item_id, ex_plant_id, buy_total, sell_total]
  );
}

// Export P&L report as PDF
const exportPDF = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Get P&L data for the specified date
    const query = `
      SELECT 
        pm.date,
        pm.item_id,
        i.item_name,
        pm.buy_total,
        pm.sell_total,
        pm.profit,
        pm.buy_quantity,
        pm.sell_quantity,
        pm.avg_buy_rate,
        pm.avg_sell_rate
      FROM plus_minus pm
      LEFT JOIN items i ON pm.item_id = i.id
      WHERE pm.date = $1
      ORDER BY i.item_name
    `;

    const result = await db.query(query, [date]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No P&L data found for this date' });
    }

    // Calculate totals
    const totals = result.rows.reduce((acc, row) => {
      acc.totalBuy += parseFloat(row.buy_total);
      acc.totalSell += parseFloat(row.sell_total);
      acc.totalProfit += parseFloat(row.profit);
      acc.totalBuyQuantity += parseFloat(row.buy_quantity);
      acc.totalSellQuantity += parseFloat(row.sell_quantity);
      return acc;
    }, { totalBuy: 0, totalSell: 0, totalProfit: 0, totalBuyQuantity: 0, totalSellQuantity: 0 });

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>P&L Report - ${date}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #007AFF;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #007AFF;
            margin-bottom: 10px;
          }
          .header h2 {
            color: #666;
            font-weight: normal;
          }
          .summary { 
            margin-bottom: 30px; 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
          }
          .summary h3 {
            color: #007AFF;
            margin-bottom: 15px;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 10px;
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 10px; 
            padding: 5px 0;
          }
          .summary-row span:first-child {
            font-weight: 600;
            color: #555;
          }
          .summary-row span:last-child {
            font-weight: bold;
            color: #333;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px 8px; 
            text-align: left; 
          }
          th { 
            background-color: #007AFF; 
            color: white;
            font-weight: bold; 
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .profit { color: #28a745; font-weight: bold; }
          .loss { color: #dc3545; font-weight: bold; }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Profit & Loss Report</h1>
          <h2>Date: ${date}</h2>
        </div>
        
        <div class="summary">
          <h3>Summary</h3>
          <div class="summary-row">
            <span>Total Purchase Quantity:</span>
            <span>${totals.totalBuyQuantity.toFixed(2)} MT</span>
          </div>
          <div class="summary-row">
            <span>Total Sell Quantity:</span>
            <span>${totals.totalSellQuantity.toFixed(2)} MT</span>
          </div>
          <div class="summary-row">
            <span>Total Purchase Value:</span>
            <span>₹${totals.totalBuy.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Total Sell Value:</span>
            <span>₹${totals.totalSell.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Net Profit/Loss:</span>
            <span class="${totals.totalProfit >= 0 ? 'profit' : 'loss'}">₹${totals.totalProfit.toLocaleString()}</span>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Purchase Qty (MT)</th>
              <th>Avg Purchase Rate</th>
              <th>Sell Qty (MT)</th>
              <th>Avg Sell Rate</th>
              <th>Profit/Loss</th>
            </tr>
          </thead>
          <tbody>
            ${result.rows.map(row => `
              <tr>
                <td>${row.item_name}</td>
                <td>${parseFloat(row.buy_quantity).toFixed(2)}</td>
                <td>₹${parseFloat(row.avg_buy_rate).toFixed(2)}</td>
                <td>${parseFloat(row.sell_quantity).toFixed(2)}</td>
                <td>₹${parseFloat(row.avg_sell_rate).toFixed(2)}</td>
                <td class="${parseFloat(row.profit) >= 0 ? 'profit' : 'loss'}">₹${parseFloat(row.profit).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Hardik Canvasing - P&L Report</p>
        </div>
      </body>
      </html>
    `;

    // Launch browser and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });
    
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pnl-report-${date}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Export P&L report as Excel
const exportExcel = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Get P&L data for the specified date
    const query = `
      SELECT 
        pm.date,
        pm.item_id,
        i.item_name,
        pm.buy_total,
        pm.sell_total,
        pm.profit,
        pm.buy_quantity,
        pm.sell_quantity,
        pm.avg_buy_rate,
        pm.avg_sell_rate
      FROM plus_minus pm
      LEFT JOIN items i ON pm.item_id = i.id
      WHERE pm.date = $1
      ORDER BY i.item_name
    `;

    const result = await db.query(query, [date]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No P&L data found for this date' });
    }

    // Calculate totals
    const totals = result.rows.reduce((acc, row) => {
      acc.totalBuy += parseFloat(row.buy_total);
      acc.totalSell += parseFloat(row.sell_total);
      acc.totalProfit += parseFloat(row.profit);
      acc.totalBuyQuantity += parseFloat(row.buy_quantity);
      acc.totalSellQuantity += parseFloat(row.sell_quantity);
      return acc;
    }, { totalBuy: 0, totalSell: 0, totalProfit: 0, totalBuyQuantity: 0, totalSellQuantity: 0 });

    // Generate CSV content for Excel
    const csvContent = [
      ['P&L Report - ' + date],
      [''],
      ['Summary'],
      ['Total Purchase Quantity (MT)', totals.totalBuyQuantity.toFixed(2)],
      ['Total Sell Quantity (MT)', totals.totalSellQuantity.toFixed(2)],
      ['Total Purchase Value', totals.totalBuy.toLocaleString()],
      ['Total Sell Value', totals.totalSell.toLocaleString()],
      ['Net Profit/Loss', totals.totalProfit.toLocaleString()],
      [''],
      ['Product-wise Breakdown'],
      ['Product', 'Purchase Qty (MT)', 'Avg Purchase Rate', 'Sell Qty (MT)', 'Avg Sell Rate', 'Profit/Loss'],
      ...result.rows.map(row => [
        row.item_name,
        parseFloat(row.buy_quantity).toFixed(2),
        parseFloat(row.avg_buy_rate).toFixed(2),
        parseFloat(row.sell_quantity).toFixed(2),
        parseFloat(row.avg_sell_rate).toFixed(2),
        parseFloat(row.profit).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="pnl-report-${date}.xls"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDailyPlusMinus,
  generateDailyPlusMinus,
  generatePlusMinusForDate,
  getPlusMinusSummary,
  getTodayPlusMinus,
  getFuturePlusMinus,
  recalculateAllPlusMinus,
  exportPDF,
  exportExcel,
}; 