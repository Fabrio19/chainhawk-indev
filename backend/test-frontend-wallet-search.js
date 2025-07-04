const fetch = require('node-fetch');

async function testFrontendWalletSearch() {
  console.log('🔍 Testing Frontend Wallet Search Flow...');
  console.log('==========================================\n');

  try {
    // Step 1: Login to get JWT token (like the frontend does)
    console.log('1️⃣ Logging in to get JWT token...');
    
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

    // Step 2: Test wallet search with the same address you're using
    console.log('\n2️⃣ Testing wallet search with your address...');
    
    const testAddress = '0x7d55f823c37a362a126aef6903e3390a8aa1b30d';
    
    const walletResponse = await fetch(`http://localhost:3001/api/wallets/${testAddress}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`📡 Wallet API Response Status: ${walletResponse.status}`);
    
    if (walletResponse.ok) {
      const walletData = await walletResponse.json();
      console.log('✅ Wallet search successful');
      console.log('📊 Wallet Data:', JSON.stringify(walletData, null, 2));
    } else {
      console.log(`❌ Wallet search failed: ${walletResponse.status}`);
      const errorText = await walletResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Step 3: Test wallet transactions
    console.log('\n3️⃣ Testing wallet transactions...');
    
    const transactionsResponse = await fetch(`http://localhost:3001/api/wallets/${testAddress}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`📡 Transactions API Response Status: ${transactionsResponse.status}`);
    
    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      console.log('✅ Wallet transactions successful');
      console.log('📊 Transactions Data:', JSON.stringify(transactionsData, null, 2));
    } else {
      console.log(`❌ Wallet transactions failed: ${transactionsResponse.status}`);
      const errorText = await transactionsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Step 4: Test sanctions screening
    console.log('\n4️⃣ Testing sanctions screening...');
    
    const sanctionsResponse = await fetch(`http://localhost:3001/api/sanctions/screen/${testAddress}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`📡 Sanctions API Response Status: ${sanctionsResponse.status}`);
    
    if (sanctionsResponse.ok) {
      const sanctionsData = await sanctionsResponse.json();
      console.log('✅ Sanctions screening successful');
      console.log('📊 Sanctions Data:', JSON.stringify(sanctionsData, null, 2));
    } else {
      console.log(`❌ Sanctions screening failed: ${sanctionsResponse.status}`);
      const errorText = await sanctionsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    console.log('\n==========================================');
    console.log('✅ Frontend wallet search test completed!');
    console.log('🎯 This shows what the backend returns when called properly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendWalletSearch(); 
 
 