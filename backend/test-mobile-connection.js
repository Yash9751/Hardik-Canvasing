const axios = require('axios');

// Test the mobile app connection
async function testMobileConnection() {
  const baseURL = 'http://172.20.10.3:5001/api';
  
  console.log('🧪 Testing Mobile App Connection...\n');
  
  try {
    // Test 1: Check if server is accessible from mobile app IP
    console.log('1. Testing server accessibility...');
    const response = await axios.get(`${baseURL}/dashboard/summary`);
    console.log('✅ Server is accessible from mobile app IP');
    console.log('📊 Dashboard data:', response.data);
    
    // Test 2: Test authentication with correct credentials
    console.log('\n2. Testing authentication...');
    const authResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: '123456'
    });
    console.log('✅ Authentication working with correct credentials');
    console.log('🔐 Login response:', authResponse.data);
    
    // Test 3: Test authentication with wrong credentials
    console.log('\n3. Testing wrong credentials...');
    try {
      await axios.post(`${baseURL}/auth/login`, {
        username: 'admin',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ Wrong credentials properly rejected');
      console.log('🔐 Error response:', error.response.data);
    }
    
    console.log('\n🎉 All tests passed! Mobile app should be able to connect.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: Make sure the backend server is running:');
      console.log('   cd backend && PORT=5001 node app.js');
    } else if (error.response) {
      console.log('\n💡 API Error:', error.response.status, error.response.data);
    }
  }
}

// Run the test
testMobileConnection(); 