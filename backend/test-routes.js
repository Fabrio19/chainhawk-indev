require('dotenv').config();

async function testRoutes() {
  console.log('🔍 Testing Express Routes...');
  console.log('==========================================\n');

  try {
    // Test health endpoint first
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      console.log('✅ Health endpoint working');
    } else {
      console.log('❌ Health endpoint failed');
      return;
    }

    // Test auth endpoint
    console.log('\n2️⃣ Testing auth endpoint...');
    const authResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cryptocompliance.com',
        password: 'Admin123!'
      })
    });
    
    if (authResponse.ok) {
      console.log('✅ Auth endpoint working');
    } else {
      console.log('❌ Auth endpoint failed');
    }

    // Test if bridges route exists by checking the 404 response
    console.log('\n3️⃣ Testing bridges route registration...');
    const bridgesResponse = await fetch('http://localhost:3001/api/bridges/test', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`Bridges test response status: ${bridgesResponse.status}`);
    const errorText = await bridgesResponse.text();
    console.log(`Error response: ${errorText}`);

    // Test other known routes
    console.log('\n4️⃣ Testing other routes...');
    
    const routes = [
      '/api/users',
      '/api/cases', 
      '/api/audit',
      '/api/sanctions',
      '/api/wallets'
    ];

    for (const route of routes) {
      try {
        const response = await fetch(`http://localhost:3001${route}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log(`${route}: ${response.status}`);
      } catch (error) {
        console.log(`${route}: Error - ${error.message}`);
      }
    }

    console.log('\n==========================================');
    console.log('✅ Route test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRoutes(); 