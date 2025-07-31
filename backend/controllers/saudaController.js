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
      business_type: 'All Kind Of Edible Oil Broker',
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
        name: 'Shree Goodluck Oil & Cotton Ind (Unjha)',
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
        name: 'Shree Goodluck Oil & Cotton Ind (Unjha)',
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
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000080'); // Dark blue for company name
    // Convert company name to proper case (first letter of each word capitalized)
    const companyName = company.company_name || 'Hardik Canvassing';
    const properCaseName = companyName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    doc.text(properCaseName, margin, 30, { align: 'center', width: contentWidth });
    doc.fillColor('#000000'); // Reset to black for rest of document
    
    doc.fontSize(12).font('Helvetica').fillColor('#000000');
    doc.text(company.business_type || 'Brokers in Edible Oil, Oilcakes Etc.,', margin, 55, { align: 'center', width: contentWidth });
    
    // Full address in one line - fixed construction
    const fullAddress = `${company.address || 'A 1503, Privilon, Ambli BRT Road, Iskon Crossroads,'},`;
    doc.text(fullAddress, margin, 75, { align: 'center', width: contentWidth });
    
    // Contact information - center aligned with proper spacing
    doc.fontSize(10);
    
    doc.text(`Mobile: ${company.mobile_number || '9824711157'}`, margin, 115, { align: 'center', width: contentWidth });
    doc.text(`e-Mail Id: ${company.email || 'hcunjha2018@gmail.com'}`, margin, 135, { align: 'center', width: contentWidth });

    // Black bar with CONTRACT CONFIRMATION title
    doc.rect(margin, 155, contentWidth, 25).fill('#000000');
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('CONTRACT CONFIRMATION', margin, 165, { align: 'center', width: contentWidth });
    doc.fillColor('#000000'); // Reset to black for rest of document
    
    // Introductory paragraph
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    doc.text('We hereby inform you that, this contract sale / purchase business was concluded today over the telephonic conversation for below commidity.', margin, 195, { width: contentWidth });

    // Contract Details - Key-value pairs format with aligned colons
    let y = 225;
    const keyX = margin + 10;
    const colonX = margin + 140; // Fixed position for all colons
    const valueX = margin + 150; // Start values right after colons
    const lineHeight = 30; // Increased line height for better spacing
    
    // Helper function to draw aligned key-value pairs
    const drawKeyValue = (key, value, currentY, isName = false) => {
      doc.fontSize(10).font('Helvetica');
      
      // Convert key to proper case (first letter capital only)
      const properCaseKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
      
      // Right-align the key to the colon
      const keyWidth = doc.widthOfString(properCaseKey);
      const keyXAligned = colonX - keyWidth - 5; // 5px gap from colon
      doc.text(properCaseKey, keyXAligned, currentY);
      
      doc.text(':', colonX, currentY);
      
      if (isName) {
        doc.font('Helvetica-Bold').fillColor('#000080'); // Dark blue for names
      } else {
        doc.font('Helvetica-Bold').fillColor('#000000'); // Black for other values
      }
      
      // Left-align the value to the right of the colon
      const valueXAligned = colonX + 9; // 9px gap from colon
      doc.text(value, valueXAligned, currentY);
      
      // Reset color
      doc.fillColor('#000000');
    };
    
    // Contract details in key-value format with aligned colons
    // Format contract number: remove "20" prefix from year (e.g., "202526/0003" -> "2526/0003")
    const contractNumber = sauda.sauda_no ? sauda.sauda_no.replace(/^20/, '') : 'N/A';
    drawKeyValue('CONTRACT NO', contractNumber, y);
    
    y += lineHeight;
    drawKeyValue('CONTRACT DATE', sauda.date ? new Date(sauda.date).toLocaleDateString('en-GB') : 'N/A', y);
    
    y += lineHeight;
    // For sell: show seller without city, buyer with city
    // For purchase: show seller with city, buyer without city
    const sellerDisplay = sauda.transaction_type === 'sell' ? seller.name : `${seller.name} (${seller.city})`;
    const buyerDisplay = sauda.transaction_type === 'sell' ? `${buyer.name} (${buyer.city})` : buyer.name;
    
    drawKeyValue('SELLER NAME', sellerDisplay, y, true); // Dark blue for names
    
    y += lineHeight;
    drawKeyValue('BUYER NAME', buyerDisplay, y, true); // Dark blue for names
    
    y += lineHeight;
    drawKeyValue('MATERIAL', sauda.item_name || 'N/A', y);
    
    y += lineHeight;
    drawKeyValue('QUANTITY', `${parseFloat(sauda.quantity_packs) || 0} MT`, y);
    
    y += lineHeight;
    drawKeyValue('RATE', `${(parseFloat(sauda.rate_per_10kg) || 0).toFixed(2)} PER 10 KG + IGST, (${sauda.ex_plant_name || 'Ex Plant'})`, y);
    
    y += lineHeight;
    drawKeyValue('DELIVERY PERIOD', sauda.delivery_condition || 'N/A', y);
    
    y += lineHeight;
    drawKeyValue('PAYMENT', sauda.payment_condition || 'Advance', y);
    
    y += lineHeight;
    drawKeyValue('REMARKS', sauda.remarks || '', y);
    
    // Add GSTIN based on transaction type
    y += lineHeight;
    if (sauda.transaction_type === 'sell') {
      drawKeyValue('BUYER GSTIN', buyer.gstin || 'N/A', y);
    } else {
      drawKeyValue('SELLER GSTIN', seller.gstin || 'N/A', y);
    }

    // Separator line
    y += 20;
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
    
    // Other Terms section
    y += 25; // Increased spacing before Other Terms
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Other Terms:', margin, y);
    
    y += 25; // Increased spacing after Other Terms title
    doc.fontSize(9).font('Helvetica');
    
    // Other terms as bullet points with better spacing
    const terms = [
      '* Buyer must be lifting all quantity on or before above mentioned delivery period, if buyer don\'t lift then seller party have right to take decision on buyer and it should be acceptable by buyer.',
      '',
      '* It is very much clear from above that the contract is between Seller & Purchaser are they themselves are responsible for any breach of terms & conditions settled between them. We stand ony as witness.',
      '',
      '* Subject To Ahmedabad Jurisdiction.'
    ];
    
    terms.forEach((term, index) => {
      if (term.trim() === '') {
        y += 12; // Less spacing for empty lines
      } else {
        doc.text(` ${term}`, margin + 10, y, { width: contentWidth - 20 });
        y += 22; // Increased spacing between terms
      }
    });
    
    // Footer section
    y += 20;
    
    // Left side - Software credit
    doc.fontSize(8).font('Helvetica');
    doc.text('SarthiHub Tech Software services, Ahmedabad. 704 374 0396', margin, y);
    
    // Right side - Company signature (adjusted Y position to prevent overlap)
    const footerY = y - 15; // Use separate variable for right side
    doc.fontSize(8).font('Helvetica');
    doc.text('E. & O.E.', margin + contentWidth - 100, footerY, { width: 100, align: 'right' });
    doc.text('Thanking You,', margin + contentWidth - 100, footerY + 15, { width: 100, align: 'right' });
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`For, ${company.company_name || 'HARDIK CANVASSING'}, ${company.city || 'AHMEDABAD'}`, margin + contentWidth - 200, footerY + 30, { width: 200, align: 'right' });
    
    // Bottom note
    y += 100;
    doc.fontSize(5).font('Helvetica');
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

// Generate message format for WhatsApp/communication
const generateSaudaMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get sauda details with related data
    const saudaResult = await db.query(`
      SELECT s.*, 
             p.party_name, p.city as party_city, p.gst_no as party_gstin,
             i.item_name,
             ep.plant_name as ex_plant_name,
             c.company_name, c.city, c.mobile_number,
             dc.condition_name as delivery_condition, pc.condition_name as payment_condition
      FROM sauda s
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      LEFT JOIN company_profile c ON c.id = 1
      LEFT JOIN delivery_conditions dc ON s.delivery_condition_id = dc.id
      LEFT JOIN payment_conditions pc ON s.payment_condition_id = pc.id
      WHERE s.id = $1
    `, [id]);
    
    if (saudaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sauda not found' });
    }
    
    const sauda = saudaResult.rows[0];
    const company = saudaResult.rows[0];
    
    // Determine seller and buyer based on transaction type
    let seller, buyer;
    if (sauda.transaction_type === 'sell') {
      seller = { name: 'Shree Goodluck Oil & Cotton Ind', city: company.city };
      buyer = { name: sauda.party_name, city: sauda.party_city, gstin: sauda.party_gstin };
    } else {
      buyer = { name: 'Shree Goodluck Oil & Cotton Ind', city: company.city };
      seller = { name: sauda.party_name, city: sauda.party_city, gstin: sauda.party_gstin };
    }
    
    // Format contract number (remove "20" prefix)
    const contractNumber = sauda.sauda_no ? sauda.sauda_no.replace(/^20/, '') : 'N/A';
    
    // Format date
    const saudaDate = sauda.date ? new Date(sauda.date).toLocaleDateString('en-GB') : 'N/A';
    
    // Format quantity with MT suffix
    const quantity = `${parseFloat(sauda.quantity_packs) || 0} MT`;
    
    // Format rate
    const rate = `${(parseFloat(sauda.rate_per_10kg) || 0).toFixed(2)} (Per 10KGs) + GST`;
    
    // Format delivery and payment conditions
    const delivery = sauda.delivery_condition || 'Ready to Weekly';
    const payment = sauda.payment_condition || '2 nd Day';
    
    // Format loading due date
    const loadingDate = sauda.loading_due_date ? new Date(sauda.loading_due_date).toLocaleDateString('en-GB') : 'N/A';
    
    // Format remarks
    const remarks = sauda.remarks || '';
    
    // Generate the message in the exact format you requested
    const message = `Please Find Contract Confirmation Sir

Sauda Date : ${saudaDate}
Confirmed Sauda : ${contractNumber}

Seller : ${seller.name} (${seller.city})
Buyer : ${buyer.name} (${buyer.city})

Item : ${sauda.item_name}
Pack : ${quantity}
Rate : ${rate}

Del. : ${delivery}
Pay. : ${payment}

Please Try to Load Before : ${loadingDate}

Note : ${remarks}

${sauda.transaction_type === 'sell' ? 'Buyer' : 'Seller'} GSTIN : ${sauda.transaction_type === 'sell' ? buyer.gstin : seller.gstin}

(Reply with Ok).
*If any mistake, Reply!*
Call - ${company.mobile_number || '9824711157'}`;
    
    res.json({ message });
  } catch (error) {
    console.error('Error generating Sauda message:', error);
    res.status(500).json({ error: 'Failed to generate message: ' + error.message });
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
  generateSaudaNotePDF,
  generateSaudaMessage
}; 