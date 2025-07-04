require('dotenv').config();
const BlockchainDataService = require('./src/services/blockchainDataService');
const rpcProvider = require('./src/utils/rpcProvider');

async function testRpcIntegration() {
  console.log('🔍 Testing RPC Provider Integration...');
  console.log('==========================================\n');

  const blockchainService = new BlockchainDataService();

  try {
    // 1. Test RPC Connections
    console.log('1️⃣ Testing RPC Connections...');
    const rpcResults = await blockchainService.testRpcConnections();
    console.log('✅ RPC Test Results:', JSON.stringify(rpcResults, null, 2));

    // 2. Test Direct RPC Functions
    console.log('\n2️⃣ Testing Direct RPC Functions...');
    
    // Test balance from RPC
    const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
    console.log(`\n📡 Testing balance from RPC for ${testAddress}...`);
    try {
      const balance = await blockchainService.getBalanceFromRpc(testAddress, 'ethereum');
      console.log('✅ Balance from RPC:', JSON.stringify(balance, null, 2));
    } catch (error) {
      console.log(`⚠️ Could not get balance from RPC: ${error.message}`);
    }

    // Test gas price from RPC
    console.log('\n📡 Testing gas price from RPC...');
    try {
      const gasPrice = await blockchainService.getGasPriceFromRpc('ethereum');
      console.log('✅ Gas price from RPC:', JSON.stringify(gasPrice, null, 2));
    } catch (error) {
      console.log(`⚠️ Could not get gas price from RPC: ${error.message}`);
    }

    // Test block number from RPC
    console.log('\n📡 Testing block number from RPC...');
    try {
      const blockNumber = await rpcProvider.getBlockNumber('ethereum');
      console.log(`✅ Latest block number from RPC: ${blockNumber}`);
    } catch (error) {
      console.log(`⚠️ Could not get block number from RPC: ${error.message}`);
    }

    // 3. Test Contract Code from RPC
    console.log('\n3️⃣ Testing Contract Code from RPC...');
    const usdtContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    console.log(`\n📡 Testing contract code from RPC for ${usdtContract}...`);
    try {
      const contractCode = await blockchainService.getContractCodeFromRpc(usdtContract, 'ethereum');
      console.log('✅ Contract code from RPC:', JSON.stringify(contractCode, null, 2));
    } catch (error) {
      console.log(`⚠️ Could not get contract code from RPC: ${error.message}`);
    }

    // 4. Test Transaction from RPC
    console.log('\n4️⃣ Testing Transaction from RPC...');
    const testTxHash = '0x55c5de9889fbd6bbcffc5a57109256ec090fe1723ccb6fe8849645b6e132c72b';
    console.log(`\n📡 Testing transaction from RPC: ${testTxHash}...`);
    try {
      const transaction = await blockchainService.getTransactionFromRpc(testTxHash, 'ethereum');
      console.log('✅ Transaction from RPC:', JSON.stringify(transaction, null, 2));
    } catch (error) {
      console.log(`⚠️ Could not get transaction from RPC: ${error.message}`);
    }

    // 5. Test BSC RPC
    console.log('\n5️⃣ Testing BSC RPC...');
    const bscAddress = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3';
    console.log(`\n📡 Testing BSC balance from RPC for ${bscAddress}...`);
    try {
      const bscBalance = await blockchainService.getBalanceFromRpc(bscAddress, 'bsc');
      console.log('✅ BSC balance from RPC:', JSON.stringify(bscBalance, null, 2));
    } catch (error) {
      console.log(`⚠️ Could not get BSC balance from RPC: ${error.message}`);
    }

    // 6. Test Comprehensive Data (API + RPC)
    console.log('\n6️⃣ Testing Comprehensive Data (API + RPC)...');
    console.log(`\n📡 Testing comprehensive data for ${testAddress}...`);
    try {
      const comprehensiveData = await blockchainService.getComprehensiveData(testAddress, 'ethereum');
      console.log('✅ Comprehensive data:', JSON.stringify(comprehensiveData, null, 2));
    } catch (error) {
      console.log(`⚠️ Could not get comprehensive data: ${error.message}`);
    }

    // 7. Test Utility Functions
    console.log('\n7️⃣ Testing Utility Functions...');
    
    // Test address validation
    const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
    const invalidAddress = '0xinvalid';
    
    console.log(`\n📡 Testing address validation...`);
    console.log(`Valid address ${validAddress}: ${rpcProvider.isValidAddress(validAddress)}`);
    console.log(`Invalid address ${invalidAddress}: ${rpcProvider.isValidAddress(invalidAddress)}`);
    
    // Test address formatting
    console.log(`\n📡 Testing address formatting...`);
    console.log(`Formatted address: ${rpcProvider.formatAddress(validAddress)}`);
    
    // Test supported chains
    console.log(`\n📡 Testing supported chains...`);
    console.log(`Supported chains: ${rpcProvider.getSupportedChains().join(', ')}`);

    // 8. Test RPC Configuration
    console.log('\n8️⃣ Testing RPC Configuration...');
    const rpcConfig = rpcProvider.getRpcConfig();
    console.log('✅ RPC Configuration:', JSON.stringify(rpcConfig, null, 2));

    console.log('\n==========================================');
    console.log('✅ RPC Provider Integration Test Completed!');
    console.log('🎯 Your system now supports both API and direct RPC data fetching');
    console.log('📊 Multiple chains with fallback RPC endpoints are configured');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test specific RPC functionality
async function testSpecificRpcFunction() {
  console.log('🔍 Testing Specific RPC Function...');
  console.log('==========================================\n');

  try {
    // Test Ethereum provider directly
    console.log('📡 Testing Ethereum provider directly...');
    const ethProvider = rpcProvider.getProvider('ethereum');
    const blockNumber = await ethProvider.getBlockNumber();
    console.log(`✅ Ethereum latest block: ${blockNumber}`);

    // Test BSC provider directly
    console.log('\n📡 Testing BSC provider directly...');
    const bscProvider = rpcProvider.getProvider('bsc');
    const bscBlockNumber = await bscProvider.getBlockNumber();
    console.log(`✅ BSC latest block: ${bscBlockNumber}`);

    // Test network info
    console.log('\n📡 Testing network info...');
    const ethNetwork = await rpcProvider.getNetwork('ethereum');
    const bscNetwork = await rpcProvider.getNetwork('bsc');
    console.log(`✅ Ethereum network: ${ethNetwork.name} (chainId: ${ethNetwork.chainId})`);
    console.log(`✅ BSC network: ${bscNetwork.name} (chainId: ${bscNetwork.chainId})`);

  } catch (error) {
    console.error('❌ Specific RPC test failed:', error.message);
  }
}

// Run tests
if (process.argv.includes('--specific')) {
  testSpecificRpcFunction();
} else {
  testRpcIntegration();
} 
 
 