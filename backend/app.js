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

// Manual database initialization endpoint
app.get('/api/init-db', async (req, res) => {
  try {
    console.log('Manual database initialization started...');
    await initializeDatabase();
    res.json({
      status: 'OK',
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual database initialization failed:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Database initialization failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple SQL execution endpoint for debugging
app.get('/api/execute-sql', async (req, res) => {
  try {
    const pool = require('./db');
    const { sql } = req.query;
    
    if (!sql) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'SQL query parameter is required',
        example: '/api/execute-sql?sql=CREATE TABLE test (id SERIAL PRIMARY KEY)'
      });
    }
    
    console.log('Executing SQL:', sql);
    const result = await pool.query(sql);
    
    res.json({
      status: 'OK',
      message: 'SQL executed successfully',
      result: result.rows,
      rowCount: result.rowCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SQL execution error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'SQL execution failed',
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
    console.log('Starting server initialization...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Database host:', process.env.DB_HOST || 'localhost');
    console.log('Database name:', process.env.DB_NAME || 'goodluck_tracker');
    
    // Start the server first
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Server is ready to accept requests');
    });
    
    // Try to initialize database tables (but don't fail if it doesn't work)
    try {
      console.log('Attempting to initialize database tables...');
      await initializeDatabase();
      console.log('Database initialization completed successfully');
    } catch (dbError) {
      console.error('Database initialization failed, but server will continue:', dbError.message);
      console.log('You can manually initialize the database using /api/init-db endpoint');
    }
    
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
};

startServer();
