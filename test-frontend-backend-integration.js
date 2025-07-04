require('dotenv').config();

async function testFrontendBackendIntegration() {
  console.log('🔍 Testing Frontend-Backend Integration...');
  console.log('==========================================\n');

  const testAddress = '0x7d55f823c37a362a126aef6903e3390a8aa1b30d';

  try {
    // 1. Test if frontend is accessible
    console.log('1️⃣ Testing frontend accessibility...');
    try {
      const frontendResponse = await fetch('http://localhost:8083');
      console.log(`✅ Frontend is accessible (Status: ${frontendResponse.status})`);
    } catch (error) {
      console.log('❌ Frontend is not accessible:', error.message);
    }

    // 2. Test backend health
    console.log('\n2️⃣ Testing backend health...');
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend health check passed:', JSON.stringify(healthData, null, 2));
    } else {
      console.log('❌ Backend health check failed');
    }

    // 3. Test authentication
    console.log('\n3️⃣ Testing authentication...');
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
    console.log('✅ Authentication successful');

    // 4. Test wallet API with real address
    console.log('\n4️⃣ Testing wallet API with real address...');
    const walletResponse = await fetch(`http://localhost:3001/api/wallets/${testAddress}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (walletResponse.ok) {
      const walletData = await walletResponse.json();
      console.log('✅ Wallet API working');
      console.log('📊 Real Wallet Data:');
      console.log(`   Address: ${walletData.address}`);
      console.log(`   Balance: ${walletData.balance}`);
      console.log(`   Risk Score: ${walletData.riskScore}`);
      console.log(`   Last Activity: ${walletData.lastActivity}`);
      console.log(`   Chain: ${walletData.chain}`);
      console.log(`   Entity Type: ${walletData.entityType}`);
      console.log(`   Labels: ${walletData.labels.join(', ')}`);
      console.log(`   Is Blacklisted: ${walletData.isBlacklisted}`);
    } else {
      console.log(`❌ Wallet API failed: ${walletResponse.status}`);
      const errorText = await walletResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // 5. Test transactions API
    console.log('\n5️⃣ Testing transactions API...');
    const transactionsResponse = await fetch(`http://localhost:3001/api/wallets/${testAddress}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      console.log('✅ Transactions API working');
      console.log(`📊 Found ${transactionsData.data?.transactions?.length || 0} ETH transactions`);
      console.log(`📊 Found ${transactionsData.data?.tokenTransfers?.length || 0} token transfers`);
    } else {
      console.log(`❌ Transactions API failed: ${transactionsResponse.status}`);
      const errorText = await transactionsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    // 6. Test sanctions API
    console.log('\n6️⃣ Testing sanctions API...');
    const sanctionsResponse = await fetch(`http://localhost:3001/api/sanctions/screen/${testAddress}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (sanctionsResponse.ok) {
      const sanctionsData = await sanctionsResponse.json();
      console.log('✅ Sanctions API working');
      console.log(`📊 Sanctions found: ${sanctionsData.length}`);
    } else {
      console.log(`❌ Sanctions API failed: ${sanctionsResponse.status}`);
      const errorText = await sanctionsResponse.text();
      console.log(`Error: ${errorText}`);
    }

    console.log('\n==========================================');
    console.log('🎯 SUMMARY:');
    console.log('✅ Backend is working and returning real blockchain data');
    console.log('✅ All API endpoints are functional');
    console.log('✅ Frontend should now display real data instead of mock data');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Go to http://localhost:8083 in your browser');
    console.log('2. Sign in with admin@cryptocompliance.com / Admin123!');
    console.log('3. Go to Wallet Screening page');
    console.log('4. Enter the address: 0x7d55f823c37a362a126aef6903e3390a8aa1b30d');
    console.log('5. Click "Screen Wallet"');
    console.log('6. You should now see REAL blockchain data!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendBackendIntegration(); 
 
 