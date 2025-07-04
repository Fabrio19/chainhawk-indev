require('dotenv').config();
const jwt = require('jsonwebtoken');

async function testBridgeAPI() {
  console.log('🔍 Testing Bridge API Endpoints...');
  console.log('==========================================\n');

  try {
    // First, let's get a JWT token by logging in
    console.log('1️⃣ Getting JWT token...');
    
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cryptocompliance.com',
        password: 'Admin123!'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('✅ JWT token obtained');

    // Test bridge transactions endpoint
    console.log('\n2️⃣ Testing /api/bridges/transactions...');
    
    const transactionsResponse = await fetch('http://localhost:3001/api/bridges/transactions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      console.log('✅ Bridge transactions endpoint working');
      console.log(`📊 Found ${transactionsData.data?.transactions?.length || 0} transactions`);
    } else {
      console.log(`❌ Bridge transactions failed: ${transactionsResponse.status}`);
      const errorText = await transactionsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Test bridge statistics endpoint
    console.log('\n3️⃣ Testing /api/bridges/statistics...');
    
    const statsResponse = await fetch('http://localhost:3001/api/bridges/statistics', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Bridge statistics endpoint working');
      console.log('📊 Statistics:', JSON.stringify(statsData, null, 2));
    } else {
      console.log(`❌ Bridge statistics failed: ${statsResponse.status}`);
      const errorText = await statsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Test bridge configurations endpoint
    console.log('\n4️⃣ Testing /api/bridges/configurations...');
    
    const configResponse = await fetch('http://localhost:3001/api/bridges/configurations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('✅ Bridge configurations endpoint working');
      console.log('📋 Configurations:', JSON.stringify(configData, null, 2));
    } else {
      console.log(`❌ Bridge configurations failed: ${configResponse.status}`);
      const errorText = await configResponse.text();
      console.log(`Error: ${errorText}`);
    }

    console.log('\n==========================================');
    console.log('✅ Bridge API test completed!');
    console.log('🎯 Frontend should be able to connect to these endpoints');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBridgeAPI(); 