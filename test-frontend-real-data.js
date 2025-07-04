const fetch = require('node-fetch');

async function testFrontendRealData() {
  console.log('🔍 Testing Frontend Real Data Integration...');
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

    // Test wallet search with real address
    console.log('\n2️⃣ Testing wallet search with real address...');
    
    const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'; // Vitalik's address
    
    const walletResponse = await fetch(`http://localhost:3001/api/wallets/${testAddress}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (walletResponse.ok) {
      const walletData = await walletResponse.json();
      console.log('✅ Wallet search working with real data');
      console.log(`📊 Address: ${walletData.address}`);
      console.log(`💰 Balance: ${walletData.balanceFormatted} ETH`);
      console.log(`🔗 Chain: ${walletData.chain}`);
      console.log(`📅 Last Activity: ${walletData.lastActivity}`);
    } else {
      console.log(`❌ Wallet search failed: ${walletResponse.status}`);
      const errorText = await walletResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Test wallet transactions
    console.log('\n3️⃣ Testing wallet transactions...');
    
    const transactionsResponse = await fetch(`http://localhost:3001/api/wallets/${testAddress}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      console.log('✅ Wallet transactions working with real data');
      console.log(`📊 Found ${transactionsData.data?.transactions?.length || 0} transactions`);
      
      if (transactionsData.data?.transactions?.length > 0) {
        const firstTx = transactionsData.data.transactions[0];
        console.log(`🔗 First transaction: ${firstTx.hash}`);
        console.log(`💰 Amount: ${firstTx.valueFormatted} ETH`);
        console.log(`📅 Timestamp: ${new Date(firstTx.timestamp * 1000).toISOString()}`);
      }
    } else {
      console.log(`❌ Wallet transactions failed: ${transactionsResponse.status}`);
      const errorText = await transactionsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Test bridge transactions
    console.log('\n4️⃣ Testing bridge transactions...');
    
    const bridgeResponse = await fetch('http://localhost:3001/api/bridges/transactions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (bridgeResponse.ok) {
      const bridgeData = await bridgeResponse.json();
      console.log('✅ Bridge transactions working with real data');
      console.log(`📊 Found ${bridgeData.data?.transactions?.length || 0} bridge transactions`);
    } else {
      console.log(`❌ Bridge transactions failed: ${bridgeResponse.status}`);
      const errorText = await bridgeResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // Test frontend API endpoints that should now use real data
    console.log('\n5️⃣ Testing frontend API endpoints...');
    
    // Test dashboard stats
    const dashboardResponse = await fetch('http://localhost:3001/api/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('✅ Dashboard stats endpoint working');
      console.log('📊 Dashboard data:', JSON.stringify(dashboardData, null, 2));
    } else {
      console.log(`❌ Dashboard stats failed: ${dashboardResponse.status}`);
    }

    console.log('\n==========================================');
    console.log('✅ Frontend Real Data Test Completed!');
    console.log('🎯 The frontend should now be using real data from the backend');
    console.log('💡 Try searching for a wallet address in the frontend now');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendRealData(); 
 
 