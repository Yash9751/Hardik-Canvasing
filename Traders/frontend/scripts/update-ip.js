const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to get current IP address
function getCurrentIP() {
  try {
    const output = execSync("ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -1", { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    console.error('Error getting IP address:', error.message);
    return null;
  }
}

// Function to update API config
function updateAPIConfig(newIP) {
  const configPath = path.join(__dirname, '../config/api.ts');
  
  try {
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Update the BASE_URL with new IP
    const newBaseURL = `  BASE_URL: 'http://${newIP}:5001/api',`;
    content = content.replace(
      /BASE_URL:\s*'http:\/\/[^']*'/,
      `BASE_URL: 'http://${newIP}:5001/api'`
    );
    
    fs.writeFileSync(configPath, content);
    console.log(`✅ Updated API config with new IP: ${newIP}`);
    console.log(`📱 Mobile app will now connect to: http://${newIP}:5001/api`);
    
  } catch (error) {
    console.error('Error updating API config:', error.message);
  }
}

// Main function
function main() {
  console.log('🔍 Checking current IP address...');
  
  const currentIP = getCurrentIP();
  if (!currentIP) {
    console.error('❌ Could not determine IP address');
    return;
  }
  
  console.log(`📍 Current IP address: ${currentIP}`);
  updateAPIConfig(currentIP);
  
  console.log('\n💡 Instructions:');
  console.log('1. Make sure your backend server is running: cd backend && npm start');
  console.log('2. Restart your mobile app to pick up the new IP address');
  console.log('3. Try logging in with: admin / 123456');
}

// Run the script
main(); 