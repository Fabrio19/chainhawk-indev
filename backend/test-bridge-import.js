require('dotenv').config();

async function testBridgeImport() {
  console.log('🔍 Testing Bridge Import...');
  console.log('==========================================\n');

  try {
    console.log('1️⃣ Testing bridge controller import...');
    const bridgeController = require('./src/controllers/bridgeController');
    console.log('✅ Bridge controller imported successfully');
    console.log('📋 Available functions:', Object.keys(bridgeController));

    console.log('\n2️⃣ Testing bridge routes import...');
    const bridgeRoutes = require('./src/routes/bridges');
    console.log('✅ Bridge routes imported successfully');
    console.log('📋 Router type:', typeof bridgeRoutes);

    console.log('\n3️⃣ Testing bridge monitor import...');
    const bridgeMonitor = require('./src/services/bridgeMonitor');
    console.log('✅ Bridge monitor imported successfully');
    console.log('📋 Available exports:', Object.keys(bridgeMonitor));

    console.log('\n4️⃣ Testing bridge ABIs import...');
    const bridgeABIs = require('./src/services/abis/bridgeABIs');
    console.log('✅ Bridge ABIs imported successfully');
    console.log('📋 Available ABIs:', Object.keys(bridgeABIs));

    console.log('\n==========================================');
    console.log('✅ All bridge imports working!');
    console.log('🎯 The issue might be in the Express route registration');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testBridgeImport(); 