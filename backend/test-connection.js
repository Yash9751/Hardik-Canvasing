const axios = require('axios');

// Test the backend connection
async function testBackendConnection() {
  const baseURL = 'http://localhost:5000/api';
  
  console.log('🧪 Testing Backend Connection...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connection...');
    const response = await axios.get(`${baseURL}/dashboard/summary`);
    console.log('✅ Server is running and responding');
    console.log('📊 Dashboard data:', response.data);
    
    // Test 2: Test authentication
    console.log('\n2. Testing authentication...');
    const authResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ Authentication working');
    console.log('🔐 Login response:', authResponse.data);
    
    // Test 3: Test stock API
    console.log('\n3. Testing stock API...');
    const stockResponse = await axios.get(`${baseURL}/stock`);
    console.log('✅ Stock API working');
    console.log('📦 Stock data:', stockResponse.data);
    
    console.log('\n🎉 All tests passed! Backend is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: Make sure the backend server is running:');
      console.log('   cd backend && npm run dev');
    } else if (error.response) {
      console.log('\n💡 API Error:', error.response.status, error.response.data);
    }
  }
}

// Run the test
testBackendConnection(); 