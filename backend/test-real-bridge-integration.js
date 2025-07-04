const RealBlockchainListener = require('./src/services/realBlockchainListener');
const BridgeMonitoringManager = require('./src/services/bridgeMonitoringManager');

async function testRealBridgeIntegration() {
  console.log('🧪 Testing Real Bridge Integration...\n');

  const manager = new BridgeMonitoringManager();

  try {
    // Test 1: Initialize manager
    console.log('1️⃣ Testing manager initialization...');
    const initResult = await manager.initialize();
    console.log(`✅ Initialization result: ${initResult}\n`);

    // Test 2: Get status
    console.log('2️⃣ Testing status retrieval...');
    const status = manager.getStatus();
    console.log('📊 Manager Status:', JSON.stringify(status, null, 2));
    console.log('');

    // Test 3: Test real blockchain listener (if enabled)
    if (process.env.USE_REAL_BLOCKCHAIN === 'true') {
      console.log('3️⃣ Testing real blockchain listener...');
      
      if (manager.realListener) {
        const listenerStatus = manager.realListener.getStatus();
        console.log('🔗 Real Listener Status:', JSON.stringify(listenerStatus, null, 2));
        
        // Test starting real listener
        console.log('🎧 Starting real blockchain listener...');
        await manager.realListener.startListening();
        
        // Wait a bit to see if any events come in
        console.log('⏳ Waiting 30 seconds for real blockchain events...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        console.log('🛑 Stopping real blockchain listener...');
        await manager.realListener.stopListening();
      } else {
        console.log('⚠️ Real blockchain listener not initialized');
      }
    } else {
      console.log('3️⃣ Testing mock monitoring...');
      console.log('🎭 Starting mock bridge monitoring...');
      await manager.startMonitoring();
      
      // Wait a bit to see mock events
      console.log('⏳ Waiting 10 seconds for mock events...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      console.log('🛑 Stopping mock monitoring...');
      await manager.stopMonitoring();
    }
    console.log('');

    // Test 4: Test database operations
    console.log('4️⃣ Testing database operations...');
    
    // Get recent transactions
    const recentTransactions = await manager.getRecentTransactions(10);
    console.log(`📋 Recent transactions: ${recentTransactions.length} found`);
    
    // Get transaction stats
    const transactionStats = await manager.getTransactionStats();
    console.log('📊 Transaction stats:', JSON.stringify(transactionStats, null, 2));
    
    // Get risk analysis
    const riskAnalysis = await manager.getRiskAnalysis();
    console.log(`⚠️ High risk transactions: ${riskAnalysis.highRiskTransactions.length} found`);
    console.log('');

    // Test 5: Test cross-chain links
    console.log('5️⃣ Testing cross-chain links...');
    const crossChainLinks = await manager.getCrossChainLinks(10);
    console.log(`🔗 Cross-chain links: ${crossChainLinks.length} found`);
    console.log('');

    // Test 6: Test wallet flows
    console.log('6️⃣ Testing wallet flows...');
    const testWallet = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
    const walletFlows = await manager.getWalletFlows(testWallet, 10);
    console.log(`💼 Wallet flows for ${testWallet}: ${walletFlows.length} found`);
    console.log('');

    // Test 7: Test risk scores
    console.log('7️⃣ Testing risk scores...');
    const riskScores = await manager.getRiskScores('wallet', testWallet);
    console.log(`🎯 Risk scores for ${testWallet}: ${riskScores.length} found`);
    console.log('');

    // Test 8: Toggle monitoring mode
    console.log('8️⃣ Testing monitoring mode toggle...');
    const currentMode = manager.useRealBlockchain;
    console.log(`🔄 Current mode: ${currentMode ? 'real' : 'mock'}`);
    
    const newMode = await manager.toggleMonitoringMode(!currentMode);
    console.log(`🔄 Switched to: ${newMode ? 'real' : 'mock'}`);
    
    // Switch back
    await manager.toggleMonitoringMode(currentMode);
    console.log(`🔄 Switched back to: ${currentMode ? 'real' : 'mock'}`);
    console.log('');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    await manager.cleanup();
    console.log('✅ Cleanup completed');
  }
}

// Environment setup for testing
async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  // Set environment variables for testing
  process.env.USE_REAL_BLOCKCHAIN = 'false'; // Start with mock mode
  
  // You can set real RPC URLs here for testing
  // process.env.ETHEREUM_RPC_URL = 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
  // process.env.BSC_RPC_URL = 'https://bsc-dataseed.binance.org/';
  // process.env.POLYGON_RPC_URL = 'https://polygon-rpc.com/';
  
  console.log('✅ Test environment ready');
}

// Run the test
async function runTest() {
  await setupTestEnvironment();
  await testRealBridgeIntegration();
}

// Export for use in other scripts
module.exports = {
  testRealBridgeIntegration,
  setupTestEnvironment
};

// Run if called directly
if (require.main === module) {
  runTest().catch(console.error);
} 