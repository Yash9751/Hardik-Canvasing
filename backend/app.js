require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 5001;

// Use explicit CORS options with more specific configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8081', 'http://172.20.10.3:5001', 'http://192.168.29.119:5001', 'http://192.168.1.5:5001', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hardik Canvasing API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/parties', require('./routes/partiesRoutes'));
app.use('/api/items', require('./routes/itemsRoutes'));
app.use('/api/ex-plants', require('./routes/exPlantsRoutes'));
app.use('/api/brokers', require('./routes/brokersRoutes'));
app.use('/api/delivery-conditions', require('./routes/deliveryConditionsRoutes'));
app.use('/api/payment-conditions', require('./routes/paymentConditionsRoutes'));
app.use('/api/sauda', require('./routes/saudaRoutes'));
app.use('/api/loading', require('./routes/loadingRoutes'));
app.use('/api/rates', require('./routes/ratesRoutes'));
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/plusminus', require('./routes/plusMinusRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/vendors', require('./routes/vendorsRoutes'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
