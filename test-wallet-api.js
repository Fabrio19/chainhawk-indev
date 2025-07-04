require('dotenv').config();
const jwt = require('jsonwebtoken');

async function testWalletAPI() {
  console.log('🔍 Testing Wallet API Endpoints...');
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

    // Test wallet search endpoint with a real Ethereum address
    console.log('\n2️⃣ Testing /api/wallets/{address}...');
    
    const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'; // Vitalik's address
    
    const walletResponse = await fetch(`http://localhost:3001/api/wallets/${testAddress}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`Response status: ${walletResponse.status}`);
    
    if (walletResponse.ok) {
      const walletData = await walletResponse.json();
      console.log('✅ Wallet search endpoint working');
      console.log('📊 Wallet data:', JSON.stringify(walletData, null, 2));
    } else {
      console.log(`❌ Wallet search failed: ${walletResponse.status}`);
      const errorText = await walletResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Test wallet transactions endpoint
    console.log('\n3️⃣ Testing /api/wallets/{address}/transactions...');
    
    const transactionsResponse = await fetch(`http://localhost:3001/api/wallets/${testAddress}/transactions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`Response status: ${transactionsResponse.status}`);
    
    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      console.log('✅ Wallet transactions endpoint working');
      console.log('📊 Transactions data:', JSON.stringify(transactionsData, null, 2));
    } else {
      console.log(`❌ Wallet transactions failed: ${transactionsResponse.status}`);
      const errorText = await transactionsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Test sanctions screening endpoint
    console.log('\n4️⃣ Testing /api/sanctions/screen/{address}...');
    
    const sanctionsResponse = await fetch(`http://localhost:3001/api/sanctions/screen/${testAddress}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`Response status: ${sanctionsResponse.status}`);
    
    if (sanctionsResponse.ok) {
      const sanctionsData = await sanctionsResponse.json();
      console.log('✅ Sanctions screening endpoint working');
      console.log('📊 Sanctions data:', JSON.stringify(sanctionsData, null, 2));
    } else {
      console.log(`❌ Sanctions screening failed: ${sanctionsResponse.status}`);
      const errorText = await sanctionsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    console.log('\n==========================================');
    console.log('✅ Wallet API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWalletAPI(); 
 
 