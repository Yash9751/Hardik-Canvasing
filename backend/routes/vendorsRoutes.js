const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/vendorsController');

// CSV/VCF import route (unified)
router.post('/import/file', upload.single('file'), importVendorsFromFile);

// Legacy CSV import route (for backward compatibility)
router.post('/import/csv', upload.single('csvFile'), importVendorsFromCSV);

// VCF import route (for specific VCF imports)
router.post('/import/vcf', upload.single('vcfFile'), importVendorsFromVCF);

// Download sample CSV template
router.get('/sample-csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sample-contacts.csv"');
  res.sendFile('sample-contacts.csv', { root: __dirname + '/../' });
});

// Direct messaging routes (must be before vendor routes to avoid conflicts)
router.get('/messaging/status', getMessagingStatus);
router.post('/channels/:channelId/generate-message', generateDirectMessageInstructions);
router.post('/channels/:channelId/export-csv', generateMessagingCSV);
router.post('/channels/:channelId/send-messages', sendActualMessages);
router.get('/messages/:messageId/status', checkMessageStatus);

// Channel management routes
router.get('/channels', getAllChannels);
router.post('/channels', createChannel);

// Channel vendors routes
router.get('/channels/:channelId/vendors', getVendorsInChannel);
router.post('/channels/:channelId/vendors', addVendorsToChannel);

// Channel rates routes
router.get('/channels/rates', getChannelRates);
router.post('/channels/rates', setChannelRates);

// Broadcast routes
router.get('/channels/:channelId/broadcast/message', generateChannelBroadcastMessage);
router.post('/broadcast/history', saveBroadcastHistory);
router.get('/broadcast/history', getBroadcastHistory);

// Vendor management routes (must be last to avoid conflicts)
router.get('/', getAllVendors);
router.get('/:id', getVendorById);
router.post('/', createVendor);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

module.exports = router; 