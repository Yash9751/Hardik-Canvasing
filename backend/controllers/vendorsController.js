const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const vcard = require('vcard-parser');
const directMessagingService = require('../services/directMessagingService');
const messagingService = require('../services/messagingService');

// Configure multer for CSV upload
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Get all vendors
const getAllVendors = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.*, 
             COALESCE(array_remove(array_agg(bc.channel_name), NULL), ARRAY[]::text[]) as channels
      FROM vendors v
      LEFT JOIN vendor_channels vc ON v.id = vc.vendor_id
      LEFT JOIN broadcast_channels bc ON vc.channel_id = bc.id
      WHERE v.is_active = true 
      GROUP BY v.id
      ORDER BY v.vendor_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting vendors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get vendor by ID
const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT v.*, 
             COALESCE(array_remove(array_agg(bc.channel_name), NULL), ARRAY[]::text[]) as channels
      FROM vendors v
      LEFT JOIN vendor_channels vc ON v.id = vc.vendor_id
      LEFT JOIN broadcast_channels bc ON vc.channel_id = bc.id
      WHERE v.id = $1
      GROUP BY v.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting vendor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new vendor
const createVendor = async (req, res) => {
  try {
    const { 
      vendor_name, 
      contact_person, 
      mobile_number, 
      whatsapp_number, 
      email, 
      city, 
      vendor_type,
      channel_ids 
    } = req.body;

    if (!vendor_name || !mobile_number) {
      return res.status(400).json({ error: 'Vendor name and mobile number are required' });
    }

    // Start transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Insert vendor
      const vendorResult = await client.query(
        `INSERT INTO vendors (vendor_name, contact_person, mobile_number, whatsapp_number, email, city, vendor_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [vendor_name, contact_person, mobile_number, whatsapp_number, email, city, vendor_type]
      );

      const vendor = vendorResult.rows[0];

      // Add vendor to channels if specified
      if (channel_ids && Array.isArray(channel_ids)) {
        for (const channelId of channel_ids) {
          await client.query(
            'INSERT INTO vendor_channels (vendor_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [vendor.id, channelId]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(vendor);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating vendor:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Mobile number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update vendor
const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      vendor_name, 
      contact_person, 
      mobile_number, 
      whatsapp_number, 
      email, 
      city, 
      vendor_type,
      is_active,
      channel_ids 
    } = req.body;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Update vendor
      const result = await client.query(
        `UPDATE vendors 
         SET vendor_name = $1, contact_person = $2, mobile_number = $3, whatsapp_number = $4, 
             email = $5, city = $6, vendor_type = $7, is_active = $8 
         WHERE id = $9 RETURNING *`,
        [vendor_name, contact_person, mobile_number, whatsapp_number, email, city, vendor_type, is_active, id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Vendor not found' });
      }

      // Update channels if specified
      if (channel_ids !== undefined) {
        // Remove existing channel mappings
        await client.query('DELETE FROM vendor_channels WHERE vendor_id = $1', [id]);
        
        // Add new channel mappings
        if (Array.isArray(channel_ids)) {
          for (const channelId of channel_ids) {
            await client.query(
              'INSERT INTO vendor_channels (vendor_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [id, channelId]
            );
          }
        }
      }

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating vendor:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Mobile number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete vendor (soft delete)
const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE vendors SET is_active = false WHERE id = $1 RETURNING *', 
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Import vendors from CSV
const importVendorsFromCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  try {
    const results = [];
    const errors = [];
    let rowNumber = 0;

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', async (data) => {
        rowNumber++;
        try {
          // Validate required fields
          if (!data.vendor_name || !data.mobile_number) {
            errors.push(`Row ${rowNumber}: Missing required fields (vendor_name, mobile_number)`);
            return;
          }

          // Clean and validate data
          const vendorData = {
            vendor_name: data.vendor_name.trim(),
            contact_person: data.contact_person?.trim() || null,
            mobile_number: data.mobile_number.trim(),
            whatsapp_number: data.whatsapp_number?.trim() || null,
            email: data.email?.trim() || null,
            city: data.city?.trim() || null,
            vendor_type: data.vendor_type?.trim() || 'customer'
          };

          // Insert vendor
          const result = await db.query(
            `INSERT INTO vendors (vendor_name, contact_person, mobile_number, whatsapp_number, email, city, vendor_type) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             ON CONFLICT (mobile_number) DO NOTHING
             RETURNING *`,
            [vendorData.vendor_name, vendorData.contact_person, vendorData.mobile_number, 
             vendorData.whatsapp_number, vendorData.email, vendorData.city, vendorData.vendor_type]
          );

          if (result.rows.length > 0) {
            results.push(result.rows[0]);
          }
        } catch (error) {
          errors.push(`Row ${rowNumber}: ${error.message}`);
        }
      })
      .on('end', () => {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({
          message: 'CSV import completed',
          imported: results.length,
          errors: errors,
          data: results
        });
      })
      .on('error', (error) => {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Error processing CSV file' });
      });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error importing vendors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Import vendors from VCF file
const importVendorsFromVCF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No VCF file uploaded' });
    }

    const vcfContent = req.file.buffer.toString('utf8');
    const cards = vcard.parse(vcfContent);
    
    const results = [];
    const errors = [];

    for (const card of cards) {
      try {
        // Extract contact information from vCard
        const vendorName = card.get('FN') || card.get('N') || 'Unknown';
        const phoneNumbers = card.getAll('TEL');
        const emails = card.getAll('EMAIL');
        const org = card.get('ORG') || '';
        
        // Get the first available phone number
        let mobileNumber = '';
        let whatsappNumber = '';
        
        if (phoneNumbers && phoneNumbers.length > 0) {
          const phone = phoneNumbers[0].replace(/[^0-9]/g, '');
          mobileNumber = phone;
          whatsappNumber = phone;
        }

        // Get the first available email
        const email = emails && emails.length > 0 ? emails[0] : '';

        // Insert vendor into database
        const result = await db.query(
          `INSERT INTO vendors (vendor_name, contact_person, mobile_number, whatsapp_number, email, city, vendor_type, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (mobile_number) DO UPDATE SET
           vendor_name = EXCLUDED.vendor_name,
           contact_person = EXCLUDED.contact_person,
           whatsapp_number = EXCLUDED.whatsapp_number,
           email = EXCLUDED.email,
           city = EXCLUDED.city,
           vendor_type = EXCLUDED.vendor_type
           RETURNING *`,
          [vendorName, vendorName, mobileNumber, whatsappNumber, email, '', 'customer', true]
        );

        results.push(result.rows[0]);
      } catch (error) {
        errors.push({
          vendor: card.get('FN') || 'Unknown',
          error: error.message
        });
      }
    }

    res.json({
      message: `Successfully imported ${results.length} contacts from VCF file`,
      imported: results.length,
      errors: errors.length,
      errorDetails: errors
    });

  } catch (error) {
    console.error('Error importing VCF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Import vendors from CSV or VCF file (unified function)
const importVendorsFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileExtension = req.file.originalname.toLowerCase().split('.').pop();
    
    if (fileExtension === 'csv') {
      return await importVendorsFromCSV(req, res);
    } else if (fileExtension === 'vcf') {
      return await importVendorsFromVCF(req, res);
    } else {
      return res.status(400).json({ 
        error: 'Unsupported file format. Please upload a CSV or VCF file.' 
      });
    }

  } catch (error) {
    console.error('Error importing file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all broadcast channels
const getAllChannels = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT bc.*, 
             COALESCE(COUNT(vc.vendor_id), 0) as vendor_count
      FROM broadcast_channels bc
      LEFT JOIN vendor_channels vc ON bc.id = vc.channel_id
      WHERE bc.is_active = true
      GROUP BY bc.id
      ORDER BY bc.channel_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting channels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get vendors in a specific channel
const getVendorsInChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const result = await db.query(`
      SELECT v.* 
      FROM vendors v
      JOIN vendor_channels vc ON v.id = vc.vendor_id
      WHERE vc.channel_id = $1 AND v.is_active = true
      ORDER BY v.vendor_name
    `, [channelId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting vendors in channel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add vendors to a channel
const addVendorsToChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { vendorIds } = req.body;
    
    if (!vendorIds || !Array.isArray(vendorIds)) {
      return res.status(400).json({ error: 'vendorIds array is required' });
    }

    // Use transaction to ensure data consistency
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Remove existing vendors from this channel
      await client.query('DELETE FROM vendor_channels WHERE channel_id = $1', [channelId]);
      
      // Add new vendors to the channel
      for (const vendorId of vendorIds) {
        await client.query(
          'INSERT INTO vendor_channels (vendor_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [vendorId, channelId]
        );
      }
      
      await client.query('COMMIT');
      res.json({ message: 'Vendors added to channel successfully', added: vendorIds.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding vendors to channel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create broadcast channel
const createChannel = async (req, res) => {
  try {
    const { channel_name, city, description } = req.body;

    if (!channel_name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const result = await db.query(
      `INSERT INTO broadcast_channels (channel_name, city, description) 
       VALUES ($1, $2, $3) RETURNING *`,
      [channel_name, city, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating channel:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Channel name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get channel-specific rates
const getChannelRates = async (req, res) => {
  try {
    const { channel_id, date } = req.query;
    
    let query = `
      SELECT cr.*, i.item_name, i.nick_name, i.hsn_code, bc.channel_name
      FROM channel_rates cr
      JOIN items i ON cr.item_id = i.id
      JOIN broadcast_channels bc ON cr.channel_id = bc.id
      WHERE 1=1
    `;
    const params = [];

    if (channel_id) {
      query += ` AND cr.channel_id = $${params.length + 1}`;
      params.push(channel_id);
    }

    if (date) {
      query += ` AND cr.effective_date = $${params.length + 1}`;
      params.push(date);
    } else {
      query += ` AND cr.effective_date = (
        SELECT MAX(effective_date) 
        FROM channel_rates cr2 
        WHERE cr2.channel_id = cr.channel_id AND cr2.item_id = cr.item_id
      )`;
    }

    query += ' ORDER BY bc.channel_name, i.item_name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting channel rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Set channel-specific rates
const setChannelRates = async (req, res) => {
  try {
    const { channel_id, rates } = req.body;

    if (!channel_id || !rates || !Array.isArray(rates)) {
      return res.status(400).json({ error: 'Channel ID and rates array are required' });
    }

    const effective_date = new Date().toISOString().split('T')[0];
    const results = [];

    for (const rate of rates) {
      const { item_id, rate_per_10kg } = rate;
      
      if (!item_id || !rate_per_10kg) {
        continue;
      }

      const result = await db.query(
        `INSERT INTO channel_rates (channel_id, item_id, rate_per_10kg, effective_date)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (channel_id, item_id, effective_date)
         DO UPDATE SET rate_per_10kg = EXCLUDED.rate_per_10kg
         RETURNING *`,
        [channel_id, item_id, rate_per_10kg, effective_date]
      );

      results.push(result.rows[0]);
    }

    res.json({
      message: 'Channel rates updated successfully',
      data: results
    });
  } catch (error) {
    console.error('Error setting channel rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate broadcast message for a channel
const generateChannelBroadcastMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { date } = req.query;
    const effective_date = date || new Date().toISOString().split('T')[0];

    // Get channel info
    const channelResult = await db.query('SELECT * FROM broadcast_channels WHERE id = $1', [channelId]);
    if (channelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channelResult.rows[0];

    // Get channel-specific rates
    const ratesResult = await db.query(`
      SELECT cr.*, i.item_name, i.nick_name
      FROM channel_rates cr
      JOIN items i ON cr.item_id = i.id
      WHERE cr.channel_id = $1 AND cr.effective_date = (
        SELECT COALESCE(
          (SELECT MAX(effective_date) 
           FROM channel_rates cr2 
           WHERE cr2.channel_id = $1 AND cr2.effective_date <= $2),
          $2
        )
      )
      ORDER BY i.item_name
    `, [channelId, effective_date]);

    if (ratesResult.rows.length === 0) {
      return res.status(404).json({ error: 'No rates found for this channel and date' });
    }

    // Get vendors in this channel
    const vendorsResult = await db.query(`
      SELECT v.*
      FROM vendors v
      JOIN vendor_channels vc ON v.id = vc.vendor_id
      WHERE vc.channel_id = $1 AND v.is_active = true
      ORDER BY v.vendor_name
    `, [channelId]);

    // Generate message
    let message = `${channel.channel_name} Market Rates\n`;
    message += `Date: ${effective_date}\n\n`;

    ratesResult.rows.forEach(rate => {
      const itemName = rate.nick_name || rate.item_name;
      message += `${itemName}: Rs.${rate.rate_per_10kg}/10kg\n`;
    });

    message += `\nTotal Contacts: ${vendorsResult.rows.length}`;
    message += `\nChannel: ${channel.channel_name}`;

    res.json({
      channel: {
        id: channel.id,
        channel_name: channel.channel_name,
        city: channel.city
      },
      message: message,
      recipients_count: vendorsResult.rows.length,
      rates: ratesResult.rows,
      effective_date: effective_date
    });

  } catch (error) {
    console.error('Error generating broadcast message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Save broadcast history
const saveBroadcastHistory = async (req, res) => {
  try {
    const { channel_id, message_content, recipients_count, status } = req.body;
    const broadcast_date = new Date().toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO broadcast_history (broadcast_date, channel_id, message_content, recipients_count, status, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [broadcast_date, channel_id, message_content, recipients_count, status, status === 'sent' ? new Date() : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving broadcast history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get broadcast history
const getBroadcastHistory = async (req, res) => {
  try {
    const { channel_id, start_date, end_date } = req.query;
    
    let query = `
      SELECT bh.*, bc.channel_name
      FROM broadcast_history bh
      JOIN broadcast_channels bc ON bh.channel_id = bc.id
      WHERE 1=1
    `;
    const params = [];

    if (channel_id) {
      query += ` AND bh.channel_id = $${params.length + 1}`;
      params.push(channel_id);
    }

    if (start_date) {
      query += ` AND bh.broadcast_date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND bh.broadcast_date <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ' ORDER BY bh.broadcast_date DESC, bh.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting broadcast history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get messaging service status
const getMessagingStatus = async (req, res) => {
  try {
    const status = directMessagingService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting messaging status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate direct messaging instructions for channel
const generateDirectMessageInstructions = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get vendors in the channel
    const vendorsResult = await db.query(`
      SELECT v.* 
      FROM vendors v
      JOIN vendor_channels vc ON v.id = vc.vendor_id
      WHERE vc.channel_id = $1 AND v.is_active = true
      ORDER BY v.vendor_name
    `, [channelId]);

    if (vendorsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No contacts found in this channel' });
    }

    // Prepare recipients
    const recipients = vendorsResult.rows.map(vendor => ({
      phone: vendor.whatsapp_number || vendor.mobile_number,
      name: vendor.vendor_name
    }));

    // Generate instructions
    const instructions = directMessagingService.generateBulkInstructions(recipients, message);
    const preview = directMessagingService.generateMessagePreview(message, recipients);

    // Save broadcast history
    await db.query(
      `INSERT INTO broadcast_history (broadcast_date, channel_id, message_content, recipients_count, status, sent_at)
       VALUES (CURRENT_DATE, $1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [channelId, message, recipients.length, 'generated']
    );

    res.json({
      message: `Generated messaging instructions for ${recipients.length} contacts`,
      instructions,
      preview,
      channelId,
      totalRecipients: recipients.length
    });

  } catch (error) {
    console.error('Error generating messaging instructions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate CSV export for bulk messaging
const generateMessagingCSV = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get vendors in the channel
    const vendorsResult = await db.query(`
      SELECT v.* 
      FROM vendors v
      JOIN vendor_channels vc ON v.id = vc.vendor_id
      WHERE vc.channel_id = $1 AND v.is_active = true
      ORDER BY v.vendor_name
    `, [channelId]);

    if (vendorsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No contacts found in this channel' });
    }

    // Prepare recipients
    const recipients = vendorsResult.rows.map(vendor => ({
      phone: vendor.whatsapp_number || vendor.mobile_number,
      name: vendor.vendor_name
    }));

    // Generate CSV
    const csv = directMessagingService.generateCSV(recipients, message);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="messaging-${channelId}-${Date.now()}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send actual messages using Twilio
const sendActualMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { message, preferWhatsApp = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if Twilio is configured
    if (!messagingService.isConfigured()) {
      return res.status(400).json({ 
        error: 'Twilio not configured. Please check your credentials.' 
      });
    }

    // Get vendors in the channel
    const vendorsResult = await db.query(`
      SELECT v.* 
      FROM vendors v
      JOIN vendor_channels vc ON v.id = vc.vendor_id
      WHERE vc.channel_id = $1 AND v.is_active = true
      ORDER BY v.vendor_name
    `, [channelId]);

    if (vendorsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No contacts found in this channel' });
    }

    // Prepare recipients
    const recipients = vendorsResult.rows.map(vendor => ({
      phone: vendor.whatsapp_number || vendor.mobile_number,
      name: vendor.vendor_name
    }));

    // Send messages using Twilio
    const results = await messagingService.sendBulkMessages(recipients, message, preferWhatsApp);

    // Calculate success count
    const successCount = results.filter(r => r.success).length;

    // Save broadcast history
    await db.query(
      `INSERT INTO broadcast_history (broadcast_date, channel_id, message_content, recipients_count, status, sent_at)
       VALUES (CURRENT_DATE, $1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [channelId, message, successCount, successCount > 0 ? 'sent' : 'failed']
    );

    res.json({
      message: `Messages sent to ${successCount} out of ${recipients.length} contacts`,
      results,
      successCount,
      totalCount: recipients.length,
      method: preferWhatsApp ? 'whatsapp' : 'sms'
    });

  } catch (error) {
    console.error('Error sending messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check message status
const checkMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    if (!messagingService.isConfigured()) {
      return res.status(400).json({ 
        error: 'Twilio not configured. Please check your credentials.' 
      });
    }

    const status = await messagingService.checkMessageStatus(messageId);
    res.json(status);

  } catch (error) {
    console.error('Error checking message status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  importVendorsFromCSV,
  importVendorsFromVCF,
  importVendorsFromFile,
  getAllChannels,
  createChannel,
  getVendorsInChannel,
  addVendorsToChannel,
  getChannelRates,
  setChannelRates,
  generateChannelBroadcastMessage,
  saveBroadcastHistory,
  getBroadcastHistory,
  getMessagingStatus,
  generateDirectMessageInstructions,
  generateMessagingCSV,
  sendActualMessages,
  checkMessageStatus,
  upload
};