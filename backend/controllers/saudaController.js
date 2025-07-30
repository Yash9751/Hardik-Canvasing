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
    console.log('PDF generation requested for sauda ID:', id);
    
    // Fetch sauda data with all related information
    const result = await db.query(`
      SELECT s.*, p.party_name, p.city as party_city, p.gst_no as party_gstin, p.contact_person, p.mobile_number as party_mobile, p.email as party_email,
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

    // Get company profile
    const companyResult = await db.query('SELECT * FROM company_profile ORDER BY id LIMIT 1');
    const company = companyResult.rows[0] || {
      company_name: 'Hardik Canvassing',
      business_type: 'Brokers in Edible Oil, Oilcakes Etc.',
      address: 'A 1503, Privilon, Ambli BRT Road, Iskon Crossroads,',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: ' 380054',
      gst_number: '24ABMPT3200E1Z0',
      mobile_number: '9825067157',
      whatsapp_number: '9825067157',
      phone_number: '(02767) 256762',
      email: 'hcunjha2018@gmail.com'
    };

    // Determine seller/buyer based on transaction type
    let seller, buyer;
    if (sauda.transaction_type === 'sell') {
      seller = {
        name: company.company_name,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        gstin: company.gst_number,
      };
      buyer = {
        name: sauda.party_name,
        address: '', // Party address not stored in current schema
        city: sauda.party_city,
        state: 'Gujarat', // Default state
        pincode: '',
        gstin: sauda.party_gstin || '',
      };
    } else {
      buyer = {
        name: company.company_name,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        gstin: company.gst_number,
      };
      seller = {
        name: sauda.party_name,
        address: '', // Party address not stored in current schema
        city: sauda.party_city,
        state: 'Gujarat', // Default state
        pincode: '',
        gstin: sauda.party_gstin || '',
      };
    }

    // Create PDF
    const doc = new PDFDocument({ 
      margin: 30, 
      size: 'A4',
      layout: 'portrait'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Contract_Note_${sauda.sauda_no}.pdf`);
    doc.pipe(res);

    // Page dimensions
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 30;
    const contentWidth = pageWidth - (2 * margin);

    // Header - Company Information (matching reference design)
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000080'); // Dark blue color
    doc.text(company.company_name || 'Hardik Canvassing', margin, 20, { align: 'center', width: contentWidth });
    
    doc.fontSize(12).font('Helvetica').fillColor('#000000');
    doc.text(company.address || 'A 1503, Privilon, Ambli BRT Road, Iskon Crossroads,', margin, 45, { align: 'center', width: contentWidth });
    
    // Contact information - left aligned like reference
    doc.fontSize(10);
    doc.text(`Mail: ${company.email || 'hcunjha2018@gmail.com'}`, margin, 65);
    doc.text(`Contact (Whatsapp): ${company.whatsapp_number || '9825067157'}`, margin, 80);
    doc.text(`Phone: ${company.phone_number || '(02767) 256762'}`, margin, 95);
    doc.text(`Mobile: ${company.mobile_number || '9825067157'}`, margin, 110);

    // Horizontal line
    doc.moveTo(margin, 130).lineTo(margin + contentWidth, 130).stroke();
    
    // Document Title
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('Contract Note', margin, 150, { align: 'center', width: contentWidth });
    
    // Horizontal line after title
    doc.moveTo(margin, 170).lineTo(margin + contentWidth, 170).stroke();

    // Document Details - Side by side layout like reference
    let y = 190;
    const leftMargin = margin + 10;
    const rightMargin = margin + contentWidth / 2 + 10;
    
    // Sauda details in two columns
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Sauda No. :', leftMargin, y);
    doc.font('Helvetica');
    doc.text(sauda.sauda_no || 'N/A', leftMargin + 80, y);
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Sauda Date:', rightMargin, y);
    doc.font('Helvetica');
    doc.text(sauda.date ? new Date(sauda.date).toLocaleDateString('en-GB') : 'N/A', rightMargin + 80, y);
    
    // Horizontal line
    y += 25;
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
    
    // General Note
    y += 15;
    doc.fontSize(10).font('Helvetica');
    doc.text('All Details like Party Name & Address are verified by GSTIN. So please use that for billing purpose.', margin, y, { align: 'center', width: contentWidth });
    
    // Thick horizontal line
    y += 20;
    doc.lineWidth(2);
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
    doc.lineWidth(1);

    // Seller and Buyer Information - Side by side like reference
    y += 20;
    const sellerX = margin + 10;
    const buyerX = margin + contentWidth / 2 + 10;
    const sellerWidth = contentWidth / 2 - 20;
    const buyerWidth = contentWidth / 2 - 20;
    
    // Seller Information (Left Column)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000080');
    doc.text(`Seller : ${seller.name}`, sellerX, y);
    y += 15;
    
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    doc.text(`Billing Add : ${seller.address}`, sellerX, y);
    y += 12;
    doc.text(`City : ${seller.city}`, sellerX, y);
    y += 12;
    doc.text(`State : ${seller.state}`, sellerX, y);
    y += 12;
    doc.text(`Pincode : ${seller.pincode}`, sellerX, y);
    y += 12;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`GSTIN : ${seller.gstin}`, sellerX, y);
    
    // Reset Y for buyer column
    y -= 60; // Go back up to align with seller
    
    // Buyer Information (Right Column)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000080');
    doc.text(`Buyer : ${buyer.name}`, buyerX, y);
    y += 15;
    
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    doc.text(`Billing Add : ${buyer.address}`, buyerX, y);
    y += 12;
    doc.text(`City : ${buyer.city}`, buyerX, y);
    y += 12;
    doc.text(`State : ${buyer.state}`, buyerX, y);
    y += 12;
    doc.text(`Pincode : ${buyer.pincode}`, buyerX, y);
    y += 12;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`GSTIN : ${buyer.gstin}`, buyerX, y);
    
    // Horizontal line
    y += 20;
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();

    // Transaction Details - Two columns like reference
    y += 20;
    
    // Left column
    doc.fontSize(10).font('Helvetica');
    doc.text(`Delivery Condition : ${sauda.delivery_condition || 'Fri-Sat'}`, sellerX, y);
    y += 12;
    doc.text(`Payment Condition : ${sauda.payment_condition || 'Advance'}`, sellerX, y);
    y += 12;
    doc.text(`Tax Type : + GST`, sellerX, y);
    y += 12;
    doc.text(`Delivery Type : -Motability Delivery`, sellerX, y);
    
    // Reset Y for right column
    y -= 36;
    
    // Right column
    doc.text(`Narration : ${parseFloat(sauda.quantity_packs) || 0} to ${parseFloat(sauda.quantity_packs) || 0} MT`, buyerX, y);
    y += 12;
    doc.text(`Delivery Add. : `, buyerX, y);
    
    // Horizontal line
    y += 20;
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();

    // Item Table - Matching reference design
    y += 20;
    
    // Table headers with proper column widths
    const tableY = y;
    const tableX = margin;
    const colWidths = [40, 200, 80, 80, 80, 100];
    let currentX = tableX;
    
    // Draw table border
    doc.rect(tableX, tableY, contentWidth, 25).stroke();
    
    // Headers
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Sr.', currentX + 5, tableY + 8);
    currentX += colWidths[0];
    doc.text('Item Name', currentX + 5, tableY + 8);
    currentX += colWidths[1];
    doc.text('Packs (M.T.)', currentX + 5, tableY + 8);
    currentX += colWidths[2];
    doc.text('Filling (*1000)', currentX + 5, tableY + 8);
    currentX += colWidths[3];
    doc.text('Quantity (K.g.)', currentX + 5, tableY + 8);
    currentX += colWidths[4];
    doc.text('Rate', currentX + 5, tableY + 8);

    // Item row
    y += 30;
    doc.rect(tableX, y, contentWidth, 35).stroke(); // Taller row for HSN code
    
    currentX = tableX;
    doc.fontSize(9).font('Helvetica');
    doc.text('1', currentX + 5, y + 8);
    currentX += colWidths[0];
    
    // Item name and HSN code
    doc.text(sauda.item_name || 'N/A', currentX + 5, y + 8);
    doc.fontSize(8);
    doc.text(`HSN Code : ${sauda.hsn_code || 'N/A'}`, currentX + 5, y + 20);
    doc.fontSize(9);
    currentX += colWidths[1];
    
    doc.text((parseFloat(sauda.quantity_packs) || 0).toFixed(2), currentX + 5, y + 8);
    currentX += colWidths[2];
    doc.text('1000.00', currentX + 5, y + 8);
    currentX += colWidths[3];
    doc.text(((parseFloat(sauda.quantity_packs) || 0) * 1000).toFixed(2), currentX + 5, y + 8);
    currentX += colWidths[4];
    
    // Rate with "Per 10 KGs" on next line
    doc.text((parseFloat(sauda.rate_per_10kg) || 0).toFixed(3), currentX + 5, y + 8);
    doc.fontSize(8);
    doc.text('(Per 10 KGs)', currentX + 5, y + 20);
    doc.fontSize(9);

    // Total row
    y += 40;
    doc.rect(tableX, y, contentWidth, 25).stroke();
    
    currentX = tableX + colWidths[0];
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Total', currentX + 5, y + 8);
    currentX += colWidths[1];
    doc.text((parseFloat(sauda.quantity_packs) || 0).toFixed(2), currentX + 5, y + 8);
    currentX += colWidths[2];
    // Empty for Filling
    currentX += colWidths[3];
    doc.text(((parseFloat(sauda.quantity_packs) || 0) * 1000).toFixed(2), currentX + 5, y + 8);

    // Footer Note
    y += 30;
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
    y += 15;
    doc.fontSize(9).font('Helvetica');
    doc.text('Note : It is very much clear from above that the contract is between Seller & Purchaser are they themselves are responsible for any breach of terms & conditions settled between them. We stand only as witness.', margin, y, { width: contentWidth });

    // Signature section - Right aligned like reference
    y += 40;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000080');
    doc.text(`For, ${company.company_name}`, margin + contentWidth - 200, y, { width: 200, align: 'right' });
    
    y += 30;
    // Space for signature
    doc.moveTo(margin + contentWidth - 150, y).lineTo(margin + contentWidth - 50, y).stroke();
    
    y += 20;
    doc.text('Proprietor', margin + contentWidth - 200, y, { width: 200, align: 'right' });

    doc.end();
    console.log('PDF generation completed successfully for sauda ID:', id);
  } catch (error) {
    console.error('Error generating Sauda Note PDF:', error);
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF: ' + error.message });
    } else {
      // If headers were already sent, we can't send JSON, so end the response
      res.end();
    }
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