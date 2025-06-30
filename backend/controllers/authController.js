const pool = require('../db');

const login = async (req, res) => {
  console.log('--- Login attempt received ---');
  try {
    const { username, password } = req.body;
    console.log('Request Body:', req.body);
    console.log(`Attempting login for user: "${username}" with password: "${password}"`);

    if (!username || !password) {
      console.log('Login failed: Missing username or password.');
      return res.status(400).json({ message: 'Username and password are required', source: 'GoodLuckTradersAPI-v2' });
    }

    const query = 'SELECT * FROM admin_user WHERE username = $1 AND password = $2';
    const result = await pool.query(query, [username, password]);
    console.log('Database query result rows:', result.rows);

    if (result.rows.length === 0) {
      console.log(`Login failed: No user found with username "${username}" and matching password.`);
      return res.status(401).json({ message: 'Invalid credentials', source: 'GoodLuckTradersAPI-v2' });
    }

    const user = result.rows[0];
    console.log('Login successful for user:', user.username);
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('--- Login error occurred ---');
    console.error(error);
    res.status(500).json({ message: 'Internal server error', source: 'GoodLuckTradersAPI-v2' });
  }
};

module.exports = {
  login
}; 