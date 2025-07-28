const db = require('../db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Get all trades report
const getAllTrades = async (req, res) => {
  try {
    const { start_date, end_date, include_zero = true } = req.query;
    let query = `
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name, b.broker_name,
             dc.condition_name as delivery_condition, pc.condition_name as payment_condition,
             CASE 
               WHEN s.pending_quantity_packs = 0 THEN 'completed'
               WHEN s.pending_quantity_packs = s.quantity_packs THEN 'pending'
               ELSE 'partial'
             END as loading_status
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
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name,
             CASE 
               WHEN s.pending_quantity_packs = 0 THEN 'completed'
               WHEN s.pending_quantity_packs = s.quantity_packs THEN 'pending'
               ELSE 'partial'
             END as loading_status
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
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name,
             CASE 
               WHEN s.pending_quantity_packs = 0 THEN 'completed'
               WHEN s.pending_quantity_packs = s.quantity_packs THEN 'pending'
               ELSE 'partial'
             END as loading_status,
             CURRENT_DATE - s.loading_due_date as days_overdue
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
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name,
             CASE 
               WHEN s.pending_quantity_packs = 0 THEN 'completed'
               WHEN s.pending_quantity_packs = s.quantity_packs THEN 'pending'
               ELSE 'partial'
             END as loading_status
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
      SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name,
             CASE 
               WHEN s.pending_quantity_packs = 0 THEN 'completed'
               WHEN s.pending_quantity_packs = s.quantity_packs THEN 'pending'
               ELSE 'partial'
             END as loading_status
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

// Helper to fetch all trades in the same format as getAllTrades
const fetchAllTradesData = async (req) => {
  const { start_date, end_date, include_zero = true } = req.query || {};
  let query = `
    SELECT s.*, p.party_name, i.item_name, ep.plant_name as ex_plant_name, b.broker_name
    FROM sauda s
    LEFT JOIN parties p ON s.party_id = p.id
    LEFT JOIN items i ON s.item_id = i.id
    LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
    LEFT JOIN brokers b ON s.broker_id = b.id
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
  return result.rows;
};

// Export to Excel
const exportExcel = async (req, res) => {
  try {
    const rows = await fetchAllTradesData(req);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    // Define columns as per image
    worksheet.columns = [
      { header: 'Sauda Date', key: 'date', width: 12 },
      { header: 'Sauda No', key: 'sauda_no', width: 12 },
      { header: 'Item', key: 'item_name', width: 12 },
      { header: 'Party Name', key: 'party_name', width: 18 },
      { header: 'Ex', key: 'ex_plant_name', width: 12 },
      { header: 'Pack', key: 'quantity_packs', width: 8 },
      { header: 'Rate', key: 'rate_per_10kg', width: 10 },
      { header: 'Broker', key: 'broker_name', width: 12 },
      { header: 'Last Date', key: 'last_date', width: 12 },
      { header: 'Due', key: 'due', width: 8 },
      { header: 'Pending', key: 'pending_quantity_packs', width: 10 },
      { header: 'L. Date', key: 'loading_due_date', width: 12 },
      { header: 'Weight', key: 'weight1', width: 10 },
      { header: 'REMOVE', key: 'remove', width: 10 },
      { header: 'Weight', key: 'weight2', width: 10 },
      { header: 'Total Load', key: 'total_load', width: 12 },
      { header: 'Avg Cost', key: 'avg_cost', width: 12 },
    ];
    // Add rows
    rows.forEach(row => {
      worksheet.addRow({
        date: row.date ? new Date(row.date).toLocaleDateString('en-GB') : '',
        sauda_no: row.sauda_no,
        item_name: row.item_name,
        party_name: row.party_name,
        ex_plant_name: row.ex_plant_name,
        quantity_packs: row.quantity_packs,
        rate_per_10kg: row.rate_per_10kg,
        broker_name: row.broker_name,
        last_date: '', // Placeholder, fill as needed
        due: '', // Placeholder, fill as needed
        pending_quantity_packs: row.pending_quantity_packs,
        loading_due_date: row.loading_due_date ? new Date(row.loading_due_date).toLocaleDateString('en-GB') : '',
        weight1: '', // Placeholder, fill as needed
        remove: '', // Placeholder, fill as needed
        weight2: '', // Placeholder, fill as needed
        total_load: '', // Placeholder, fill as needed
        avg_cost: '', // Placeholder, fill as needed
      });
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
};

// Export to PDF
const exportPDF = async (req, res) => {
  try {
    const rows = await fetchAllTradesData(req);
    const doc = new PDFDocument({ margin: 20, size: 'A3', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    doc.pipe(res);
    // Table header
    const headers = ['Sauda Date', 'Sauda No', 'Item', 'Party Name', 'Ex', 'Pack', 'Rate', 'Broker', 'Last Date', 'Due', 'Pending', 'L. Date', 'Weight', 'REMOVE', 'Weight', 'Total Load', 'Avg Cost'];
    let x = 20, y = 30;
    headers.forEach((header, i) => {
      doc.font('Helvetica-Bold').fontSize(10).text(header, x, y, { width: 80, align: 'left' });
      x += 80;
    });
    y += 20;
    // Table rows
    rows.forEach(row => {
      x = 20;
      const rowData = [
        row.date ? new Date(row.date).toLocaleDateString('en-GB') : '',
        row.sauda_no,
        row.item_name,
        row.party_name,
        row.ex_plant_name,
        row.quantity_packs,
        row.rate_per_10kg,
        row.broker_name,
        '', // Last Date
        '', // Due
        row.pending_quantity_packs,
        row.loading_due_date ? new Date(row.loading_due_date).toLocaleDateString('en-GB') : '',
        '', // Weight1
        '', // REMOVE
        '', // Weight2
        '', // Total Load
        '', // Avg Cost
      ];
      rowData.forEach((cell, i) => {
        doc.font('Helvetica').fontSize(9).text(cell !== undefined ? cell : '', x, y, { width: 80, align: 'left' });
        x += 80;
      });
      y += 18;
      if (y > doc.page.height - 40) {
        doc.addPage();
        y = 30;
        x = 20;
        headers.forEach((header, i) => {
          doc.font('Helvetica-Bold').fontSize(10).text(header, x, y, { width: 80, align: 'left' });
          x += 80;
        });
        y += 20;
      }
    });
    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
};

module.exports = {
  getAllTrades,
  getPendingTrades,
  getOverdueTrades,
  getStockWiseReport,
  getPartyWiseReport,
  exportExcel,
  exportPDF,
}; 