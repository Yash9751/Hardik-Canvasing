const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'goodluck_tracker',
  password: process.env.DB_PASSWORD || '1234',
  port: process.env.DB_PORT || 5432,
  // SSL configuration for Railway PostgreSQL
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 60000, // Increased from 30s to 60s
  connectionTimeoutMillis: 10000, // Increased from 2s to 10s
  acquireTimeoutMillis: 10000, // Add acquire timeout
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
