require('dotenv').config();

async function testFrontendConnection() {
  console.log('🔍 Testing Frontend-Backend Connection...');
  console.log('==========================================\n');

  try {
    // Test if backend is accessible from frontend's perspective
    console.log('1️⃣ Testing backend health endpoint...');
    
    const healthResponse = await fetch('http://localhost:3001/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`Health check status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend health check passed:', JSON.stringify(healthData, null, 2));
    } else {
      console.log('❌ Backend health check failed');
    }

    // Test wallet endpoint without auth (should fail but show if backend is reachable)
    console.log('\n2️⃣ Testing wallet endpoint (without auth)...');
    
    const walletResponse = await fetch('http://localhost:3001/api/wallets/0x7d55f823c37a362a126aef6903e3390a8aa1b30d', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`Wallet endpoint status: ${walletResponse.status}`);
    if (walletResponse.status === 401) {
      console.log('✅ Backend is reachable (401 Unauthorized is expected without auth)');
    } else if (walletResponse.ok) {
      console.log('❌ Unexpected: got 200 without auth');
    } else {
      console.log(`❌ Backend connection issue: ${walletResponse.status}`);
    }

    // Test CORS headers
    console.log('\n3️⃣ Testing CORS headers...');
    
    const corsResponse = await fetch('http://localhost:3001/api/wallets/0x7d55f823c37a362a126aef6903e3390a8aa1b30d', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8083',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      }
    });

    console.log(`CORS preflight status: ${corsResponse.status}`);
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': corsResponse.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': corsResponse.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': corsResponse.headers.get('Access-Control-Allow-Headers'),
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendConnection(); 
 
 