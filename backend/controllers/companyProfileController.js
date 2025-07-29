const db = require('../db');

// Get company profile
const getCompanyProfile = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM company_profile ORDER BY id LIMIT 1');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting company profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update company profile
const updateCompanyProfile = async (req, res) => {
  try {
    const { 
      company_name, 
      gst_number, 
      mobile_number, 
      email, 
      address, 
      business_type 
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const result = await db.query(`
      UPDATE company_profile 
      SET company_name = $1, gst_number = $2, mobile_number = $3, email = $4, address = $5, business_type = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM company_profile ORDER BY id LIMIT 1)
      RETURNING *
    `, [company_name, gst_number, mobile_number, email, address, business_type]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating company profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCompanyProfile,
  updateCompanyProfile
}; 