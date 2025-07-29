const express = require('express');
const router = express.Router();
const { getCompanyProfile, updateCompanyProfile } = require('../controllers/companyProfileController');

// Get company profile
router.get('/', getCompanyProfile);

// Update company profile
router.put('/', updateCompanyProfile);

module.exports = router; 