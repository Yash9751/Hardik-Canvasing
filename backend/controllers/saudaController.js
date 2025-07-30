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

    // Header - Company Information (matching CONTRACT CONFIRMATION format)
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000');
    doc.text(company.company_name || 'HARDIK CANVASSING', margin, 30, { align: 'center', width: contentWidth });
    
    doc.fontSize(12).font('Helvetica').fillColor('#000000');
    doc.text(company.business_type || 'Brokers in Edible Oil, Oilcakes Etc.,', margin, 55, { align: 'center', width: contentWidth });
    
    // Full address in one line - fixed construction
    const fullAddress = `${company.address || 'A 1503, Privilon, Ambli BRT Road, Iskon Crossroads,'} ${company.city || 'Ahmedabad'}, ${company.state || 'Gujarat'} ${company.pincode || '380054'}, India`;
    doc.text(fullAddress, margin, 75, { align: 'center', width: contentWidth });
    
    // Contact information - center aligned with proper spacing
    doc.fontSize(10);
    doc.text(`Phone: ${company.phone_number || '(02767) 256762'}`, margin, 95, { align: 'center', width: contentWidth });
    doc.text(`Mobile: ${company.mobile_number || '9824711157'}`, margin, 110, { align: 'center', width: contentWidth });
    doc.text(`e-Mail Id: ${company.email || 'hcunjha2018@gmail.com'}`, margin, 125, { align: 'center', width: contentWidth });

    // Black bar with CONTRACT CONFIRMATION title
    doc.rect(margin, 145, contentWidth, 25).fill('#000000');
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('CONTRACT CONFIRMATION', margin, 155, { align: 'center', width: contentWidth });
    doc.fillColor('#000000'); // Reset to black for rest of document
    
    // Introductory paragraph
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    doc.text('We hereby inform you that, this contract sale / purchase business was concluded today over the telephonic conversation for below commidity.', margin, 185, { width: contentWidth });

    // Contract Details - Key-value pairs format
    let y = 215;
    const keyX = margin + 10;
    const valueX = margin + 180; // Increased spacing to prevent overlap
    const lineHeight = 22; // Increased line height for better spacing
    
    // Contract details in key-value format
    doc.fontSize(10).font('Helvetica');
    doc.text('CONTRACT NO.:', keyX, y);
    doc.font('Helvetica-Bold');
    doc.text(sauda.sauda_no || 'N/A', valueX, y);
    
    y += lineHeight;
    doc.fontSize(10).font('Helvetica');
    doc.text('CONTRACT DATE:', keyX, y);
    doc.font('Helvetica-Bold');
    doc.text(sauda.date ? new Date(sauda.date).toLocaleDateString('en-GB') : 'N/A', valueX, y);
    
    y += lineHeight;
    doc.fontSize(10).font('Helvetica');
    doc.text('SELLER NAME:', keyX, y);
    doc.font('Helvetica-Bold');
    doc.text(seller.name, valueX, y);
    
    y += lineHeight;
    doc.fontSize(10).font('Helvetica');
    doc.text('BUYER NAME:', keyX, y);
    doc.font('Helvetica-Bold');
    doc.text(buyer.name, valueX, y);
    
    y += lineHeight;
    doc.fontSize(10).font('Helvetica');
    doc.text('MATERIAL:', keyX, y);
    doc.font('Helvetica-Bold');
    doc.text(sauda.item_name || 'N/A', valueX, y);
    
    y += lineHeight;
    doc.fontSize(10).font('Helvetica');
    doc.text('QUANTITY:', keyX, y);
    doc.font('Helvetica-Bold');
    doc.text(`${parseFloat(sauda.quantity_packs) || 0} TON`, valueX, y);
    
    y += lineHeight;
    doc.fontSize(10).font('Helvetica');
    doc.text('RATE:', keyX, y);
    doc.font('Helvetica-Bold');
    const rateText = `${(parseFloat(sauda.rate_per_10kg) || 0).toFixed(2)} PER 10 KG + IGST, (${sauda.ex_plant_name || 'Ex Plant'})`;
    doc.text(rateText, valueX, y);
    
    y += lineHeight;
    doc.fontSize(10).font('Helvetica');
    doc.text('DELIVERY PERIOD:', keyX, y);
    doc.font('Helvetica-Bold');
    const deliveryDate = sauda.loading_due_date ? new Date(sauda.loading_due_date).toLocaleDateString('en-GB') : 'N/A';
    doc.text(deliveryDate, valueX, y);
    
    y += lineHeight;
    doc.fontSize(10).font('Helvetica');
    doc.text('PAYMENT:', keyX, y);
    doc.font('Helvetica-Bold');
    doc.text(sauda.payment_condition || 'Advance', valueX, y);
    
    y += lineHeight;
    doc.fontSize(10).font('Helvetica');
    doc.text('REMARKS:', keyX, y);
    doc.font('Helvetica-Bold');
    doc.text('FIX DUTY', valueX, y);

    // Separator line
    y += 20;
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
    
    // Other Terms section
    y += 20;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Other Terms:', margin, y);
    
    y += 20;
    doc.fontSize(9).font('Helvetica');
    
    // Other terms as bullet points
    const terms = [
      'Buyer must be lifting all quantity on or before above mentioned delivery period, if buyer don\'t lift then seller party have right to take decision on buyer and it should be acceptable by buyer.',
      '',
      'It is very much clear from above that the contract is between Seller & Purchaser are they themselves are responsible for any breach of terms & conditions settled between them. We stand ony as witness.',
      '',
      'Subject To Ahmedabad Jurisdiction.'
    ];
    
    terms.forEach((term, index) => {
      doc.text(`* ${term}`, margin + 10, y, { width: contentWidth - 20 });
      y += 18; // Increased spacing between terms
    });
    
    // Footer section with background
    y += 20;
    
    // Footer background rectangle
    doc.rect(margin, y - 5, contentWidth, 50).fill('#F5F5F5'); // Light gray background
    
    // Left side - GST details
    doc.fontSize(8).font('Helvetica');
    doc.text(`GST# Seller: ${seller.gstin || 'N/A'}, Buyer: ${buyer.gstin || 'N/A'}`, margin + 10, y + 5);
    doc.text('SarthiHub Tech sofware services, Ahmedabad. 704 374 0396', margin + 10, y + 20);
    
    // Right side - Company signature (adjusted Y position to prevent overlap)
    const footerY = y + 5; // Use separate variable for right side
    doc.fontSize(8).font('Helvetica');
    doc.text('E. & O.E.', margin + contentWidth - 110, footerY, { width: 100, align: 'right' });
    doc.text('Thanking You,', margin + contentWidth - 110, footerY + 15, { width: 100, align: 'right' });
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`For, ${company.company_name || 'HARDIK CANVASSING'}, ${company.city || 'AHMEDABAD'}`, margin + contentWidth - 210, footerY + 30, { width: 200, align: 'right' });
    
    // Bottom note
    y += 60;
    doc.fontSize(8).font('Helvetica');
    doc.text('This is computer generated document and hence no signature required', margin, y, { align: 'center', width: contentWidth });

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