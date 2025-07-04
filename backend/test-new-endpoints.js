const fetch = require('node-fetch');

async function testNewEndpoints() {
  console.log('🔍 Testing New Backend Endpoints...');
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

    // Test dashboard stats endpoint
    console.log('\n2️⃣ Testing /api/dashboard/stats...');
    
    const statsResponse = await fetch('http://localhost:3001/api/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Dashboard stats endpoint working');
      console.log('📊 Stats:', JSON.stringify(statsData, null, 2));
    } else {
      console.log(`❌ Dashboard stats failed: ${statsResponse.status}`);
      const errorText = await statsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Test alerts endpoint
    console.log('\n3️⃣ Testing /api/alerts...');
    
    const alertsResponse = await fetch('http://localhost:3001/api/alerts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (alertsResponse.ok) {
      const alertsData = await alertsResponse.json();
      console.log('✅ Alerts endpoint working');
      console.log('📊 Alerts:', JSON.stringify(alertsData, null, 2));
    } else {
      console.log(`❌ Alerts failed: ${alertsResponse.status}`);
      const errorText = await alertsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Test tracing endpoint (no auth required)
    console.log('\n4️⃣ Testing /api/tracing/trace/:hash...');
    
    const traceResponse = await fetch('http://localhost:3001/api/tracing/trace/0x1234567890abcdef', {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (traceResponse.ok) {
      const traceData = await traceResponse.json();
      console.log('✅ Tracing endpoint working');
      console.log('📊 Trace data:', JSON.stringify(traceData, null, 2));
    } else {
      console.log(`❌ Tracing failed: ${traceResponse.status}`);
      const errorText = await traceResponse.text();
      console.log(`Error: ${errorText}`);
    }

    console.log('\n==========================================');
    console.log('✅ New endpoints test completed!');
    console.log('🎯 Frontend should now work without 404 errors');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewEndpoints(); 
 
 