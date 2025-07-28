require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initializeDatabase = require('./init-database');

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

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Hardik Canvasing API is running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hardik Canvasing API is running - Debug version',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const pool = require('./db');
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({
      status: 'OK',
      message: 'Database connection successful',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test tables endpoint
app.get('/api/test-tables', async (req, res) => {
  try {
    const pool = require('./db');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json({
      status: 'OK',
      message: 'Tables found',
      tables: result.rows.map(row => row.table_name),
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Tables test error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to check tables',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database tables
    await initializeDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
