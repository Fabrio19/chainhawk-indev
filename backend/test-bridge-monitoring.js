require('dotenv').config();
const { watchAllBridges, stopAllBridges, getBridgeStatus } = require('./main');

async function testBridgeMonitoring() {
  console.log('🧪 Testing Bridge Monitoring System...');
  console.log('==========================================\n');

  try {
    // Test 1: Start all bridge watchers
    console.log('1️⃣ Starting all bridge watchers...');
    await watchAllBridges();

    // Wait a bit to see if any watchers start successfully
    console.log('\n⏳ Waiting 10 seconds to observe watchers...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test 2: Get status of all watchers
    console.log('\n2️⃣ Getting bridge watcher status...');
    const status = getBridgeStatus();
    console.log('📊 Active watchers:', status.length);
    status.forEach(watcher => {
      console.log(`   - ${watcher.protocol} on ${watcher.chain}: ${watcher.isListening ? '✅ Active' : '❌ Inactive'}`);
    });

    // Test 3: Stop all watchers
    console.log('\n3️⃣ Stopping all bridge watchers...');
    await stopAllBridges();

    console.log('\n✅ Bridge monitoring test completed successfully!');
    
  } catch (error) {
    console.error('❌ Bridge monitoring test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testBridgeMonitoring().catch(console.error); 