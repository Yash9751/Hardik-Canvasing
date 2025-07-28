const fs = require('fs');
const path = require('path');
const pool = require('./db');

const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log('Executed SQL statement successfully');
        } catch (error) {
          // Ignore errors for IF NOT EXISTS statements
          if (!error.message.includes('already exists')) {
            console.error('Error executing SQL statement:', error.message);
          }
        }
      }
    }
    
    console.log('Database initialization completed successfully');
    
    // Test the connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

module.exports = initializeDatabase; 