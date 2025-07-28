const db = require('../db');
const stockController = require('./stockController');

const PDFDocument = require('pdfkit');
const fs = require('fs');

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
      SELECT s.*, p.party_name, p.mobile_number as party_mobile, i.item_name, ep.plant_name as ex_plant_name, b.broker_name,
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
      SELECT s.*, p.party_name, p.mobile_number as party_mobile, i.item_name, ep.plant_name as ex_plant_name, b.broker_name,
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

// Create new sauda (purchase/sell transaction)
const createSauda = async (req, res) => {
  console.log('--- Create Sauda Request Body ---');
  console.log(req.body);
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
    // Update stock after creating sauda
    await stockController.recalculateStock(item_id, ex_plant_id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sauda:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Sauda number already exists' });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
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
        loading_due_date = $10, ex_plant_id = $11, broker_id = $12, pending_quantity_packs = $6
       WHERE id = $13 RETURNING *`,
      [sauda_no, transaction_type, date, party_id, item_id, quantity_packs, rate_per_10kg,
       delivery_condition_id, payment_condition_id, loading_due_date, ex_plant_id, broker_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sauda not found' });
    }

    // Update stock after updating sauda
    await stockController.recalculateStock(item_id, ex_plant_id);

    // Recalculate P&L for the transaction date
    const plusMinusController = require('./plusMinusController');
    await plusMinusController.generatePlusMinusForDate(date);

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

// Generate Sauda Note PDF
const generateSaudaNotePDF = async (req, res) => {
  try {
    const { id } = req.params;
    // Fetch sauda data
    const result = await db.query(`
      SELECT s.*, p.party_name, p.city as party_city, p.gst_no as party_gstin,
             i.item_name, i.hsn_code,
             ep.plant_name as ex_plant_name,
             b.broker_name,
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
      console.error('Sauda not found for PDF', { id });
      return res.status(404).json({ error: 'Sauda not found' });
    }
    const sauda = result.rows[0];
    console.log('Generating Sauda Note PDF for:', sauda);

    // Static company info
    const company = {
      name: 'Shree Hardik Corporation (25-26)',
      address: '307, APMC Building, Market Yard, Unjha',
      mail: 'hcunja2018@gmail.com',
      contact: '9825067157',
      phone: '(02767) 256762, 256763, 253762, 253763',
      mobile: '9924311157, 9824711157',
      gstin: '24ABMPT3200E1Z0',
      proprietor: 'Proprietor',
    };

    // Determine seller/buyer for buy/sell
    let seller, buyer;
    if (sauda.transaction_type === 'sell') {
      seller = {
        name: 'Shree Goodluck Oil & Cotton Industries',
        billing_address: '68, Dhanjinagar, B/h Eye Hospital, Unjha',
        city: 'Jnjha',
        state: '',
        pincode: '',
        gstin: company.gstin,
      };
      buyer = {
        name: sauda.party_name,
        billing_address: sauda.party_city || '',
        city: sauda.party_city || '',
        state: '',
        pincode: '',
        gstin: sauda.party_gstin || '',
      };
    } else {
      buyer = {
        name: 'Shree Goodluck Oil & Cotton Industries',
        billing_address: '68, Dhanjinagar, B/h Eye Hospital, Unjha',
        city: 'Jnjha',
        state: '',
        pincode: '',
        gstin: company.gstin,
      };
      seller = {
        name: sauda.party_name,
        billing_address: sauda.party_city || '',
        city: sauda.party_city || '',
        state: '',
        pincode: '',
        gstin: sauda.party_gstin || '',
      };
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Sauda_Note_${sauda.sauda_no}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(company.name, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).font('Helvetica').text(company.address, { align: 'center' });
    doc.text(`Mail : ${company.mail}, Contact (Whatsapp) : ${company.contact}`, { align: 'center' });
    doc.text(`Phone : ${company.phone}  Mobile : ${company.mobile}`, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(14).font('Helvetica-Bold').text('Contract Note', { align: 'center', underline: true });
    doc.moveDown(0.5);

    // Sauda No. and Date (side by side, no overlap, bigger font, more page width)
    doc.fontSize(14).font('Helvetica-Bold');
    const saudaNoText = `Sauda No. : ${sauda.sauda_no}`;
    const saudaDateText = `Sauda Date : ${sauda.date ? new Date(sauda.date).toLocaleDateString('en-GB') : ''}`;
    doc.text(saudaNoText, 50, doc.y, { continued: true });
    const saudaDateWidth = doc.widthOfString(saudaDateText);
    doc.text(saudaDateText, 540 - saudaDateWidth, doc.y, { align: 'right' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica').text('All Details like Party Name & Address are verified by GSTIN. So please use that for billing purpose.', { align: 'left' });
    doc.moveDown(0.7);

    // Seller/Buyer columns with more padding and spacing
    const leftX = 50;
    const rightX = 340;
    let y = doc.y;
    doc.font('Helvetica-Bold').fontSize(13).text('Seller :', leftX, y, { continued: true }).font('Helvetica').text(` ${seller.name}`, doc.x, y);
    doc.font('Helvetica-Bold').fontSize(13).text('Buyer :', rightX, y, { continued: true }).font('Helvetica').text(` ${buyer.name}`, doc.x, y);
    y = doc.y + 4;
    doc.font('Helvetica').fontSize(12).text(`Billing Add : ${seller.billing_address}`, leftX, y);
    doc.font('Helvetica').fontSize(12).text(`Billing Add : ${buyer.billing_address}`, rightX, y);
    y = doc.y + 4;
    doc.text(`City : ${seller.city}   State : ${seller.state}`, leftX, y);
    doc.text(`City : ${buyer.city}   State : ${buyer.state}`, rightX, y);
    y = doc.y + 4;
    doc.text(`Pincode : ${seller.pincode}`, leftX, y);
    doc.text(`Pincode : ${buyer.pincode}`, rightX, y);
    y = doc.y + 4;
    doc.text(`GSTIN : ${seller.gstin}`, leftX, y);
    doc.text(`GSTIN : ${buyer.gstin}`, rightX, y);
    y = doc.y + 14;
    // Partition line between Seller/Buyer and next section
    doc.moveTo(50, y).lineTo(560, y).stroke();
    y += 10;

    // Delivery/Payment/Narration columns with more padding
    doc.font('Helvetica-Bold').fontSize(13).text('Delivery Condition :', leftX, y, { continued: true }).font('Helvetica').fontSize(12).text(` ${sauda.delivery_condition || ''}`, doc.x, y);
    doc.font('Helvetica-Bold').fontSize(13).text('Narration :', rightX, y, { continued: true }).font('Helvetica').fontSize(12).text(` ${sauda.quantity_packs} to ${sauda.quantity_packs} MT (+1 Brokerage Added)`, doc.x, y);
    y = doc.y + 4;
    doc.font('Helvetica-Bold').fontSize(13).text('Payment Condition :', leftX, y, { continued: true }).font('Helvetica').fontSize(12).text(` ${sauda.payment_condition || ''}`, doc.x, y);
    doc.font('Helvetica-Bold').fontSize(13).text('Delivery Add. :', rightX, y, { continued: true }).font('Helvetica').fontSize(12).text(' ', doc.x, y);
    y = doc.y + 4;
    doc.font('Helvetica-Bold').fontSize(13).text('Tax Type :', leftX, y, { continued: true }).font('Helvetica').fontSize(12).text(' + GST', doc.x, y);
    y = doc.y + 4;
    doc.font('Helvetica-Bold').fontSize(13).text('Delivery Type :', leftX, y, { continued: true }).font('Helvetica').fontSize(12).text(' -F.O.R. Delivery', doc.x, y);
    y = doc.y + 14;
    // Partition line before table
    doc.moveTo(50, y).lineTo(560, y).stroke();
    y += 12;

    // Restore proportional column widths for the table (define before any use)
    const pageLeft = 40;
    const pageRight = 555; // A4 width 595 - margin 40
    const tableX = pageLeft;
    const tableWidth = pageRight - pageLeft;
    // Proportional: Sr(6%), Item(24%), Packs(12%), Filling(14%), Qty(20%), Rate(24%)
    const colWidths = {
      sr: Math.round(tableWidth * 0.06),      // 6%
      item: Math.round(tableWidth * 0.24),    // 24%
      packs: Math.round(tableWidth * 0.12),   // 12%
      filling: Math.round(tableWidth * 0.14), // 14%
      qty: Math.round(tableWidth * 0.20),     // 20%
      rate: tableWidth - (Math.round(tableWidth * 0.06) + Math.round(tableWidth * 0.24) + Math.round(tableWidth * 0.12) + Math.round(tableWidth * 0.14) + Math.round(tableWidth * 0.20)) // remainder
    };
    const colSr = tableX;
    const colItem = colSr + colWidths.sr + 10;
    const colPacks = colItem + colWidths.item + 10;
    const colFilling = colPacks + colWidths.packs + 10;
    const colQty = colFilling + colWidths.filling + 10;
    const colRate = colQty + colWidths.qty + 10;
    // After the previous section's line (partition line before table)
    y += 16; // Add extra vertical space before table header
    // Table Header boxed between two horizontal lines
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();
    y += 6;
    doc.font('Helvetica-Bold').fontSize(13);
    doc.text('Sr.', colSr, y, { width: colWidths.sr, align: 'center' });
    doc.text('Item Name', colItem, y, { width: colWidths.item, align: 'center' });
    doc.text('Packs', colPacks, y, { width: colWidths.packs, align: 'center' });
    doc.text('Filling', colFilling, y, { width: colWidths.filling, align: 'center' });
    doc.text('Quantity', colQty, y, { width: colWidths.qty, align: 'center' });
    doc.text('Rate', colRate, y, { width: colWidths.rate, align: 'center' });
    y += 18;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('', colSr, y, { width: colWidths.sr, align: 'center' });
    doc.text('', colItem, y, { width: colWidths.item, align: 'center' });
    doc.text('(M.T.)', colPacks, y, { width: colWidths.packs, align: 'center' });
    doc.text('(*1000)', colFilling, y, { width: colWidths.filling, align: 'center' });
    doc.text('(K.g.)', colQty, y, { width: colWidths.qty, align: 'center' });
    doc.text('(Per 10 KGs)', colRate, y, { width: colWidths.rate, align: 'center' });
    y += 16;
    // Draw bottom line below header
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();
    y += 8; // Space before data row
    // Table Row with more vertical space and HSN Code on new line
    doc.font('Helvetica').fontSize(13);
    doc.text('1', colSr, y, { width: colWidths.sr, align: 'center' });
    doc.text(`${sauda.item_name}`, colItem, y, { width: colWidths.item, align: 'left' });
    doc.text(Number(sauda.quantity_packs).toFixed(2), colPacks, y, { width: colWidths.packs, align: 'center' });
    doc.text('1000.00', colFilling, y, { width: colWidths.filling, align: 'center' });
    doc.text((Number(sauda.quantity_packs) * 1000).toFixed(2), colQty, y, { width: colWidths.qty, align: 'center' });
    doc.text(Number(sauda.rate_per_10kg).toFixed(3), colRate, y, { width: colWidths.rate, align: 'center' });
    y += 20;
    doc.font('Helvetica').fontSize(12).text(`HSN Code : ${sauda.hsn_code || ''}`, colItem, y, { width: colWidths.item, align: 'left' });
    y += 24;
    doc.font('Helvetica-Bold').fontSize(13).text('Total', colItem, y, { width: colWidths.item, align: 'left' });
    doc.text(Number(sauda.quantity_packs).toFixed(2), colPacks, y, { width: colWidths.packs, align: 'center' });
    doc.text((Number(sauda.quantity_packs) * 1000).toFixed(2), colQty, y, { width: colWidths.qty, align: 'center' });
    y += 38;
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();
    y += 14;

    // Note and signature
    doc.font('Helvetica').fontSize(12).text('Note : It is very much clear from above that the contract is between Seller & Purchaser are they themselves are responsible for any breach of terms & conditions settled between them. We stand ony as witness.', tableX, y, { width: 420 });
    y += 36;
    doc.font('Helvetica-Bold').fontSize(13).text(`For, Shree Hardik Corporation (25-26)`, tableX + 270, y, { align: 'right' });
    y += 22;
    doc.font('Helvetica').fontSize(13).text(company.proprietor, tableX + 370, y, { align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Error generating Sauda Note PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

module.exports = {
  getAllSauda,
  getSaudaById,
  createSauda,
  updateSauda,
  deleteSauda,
  getPendingSauda,
  getNextSaudaNumber,
  generateSaudaNotePDF
}; 