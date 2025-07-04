require('dotenv').config();
const BlockchainDataService = require('./src/services/blockchainDataService');

async function testRealAddress() {
  console.log('🔍 Testing Real Address with Blockchain Service...');
  console.log('==========================================\n');

  const address = '0x7d55f823c37a362a126aef6903e3390a8aa1b30d';
  const blockchainService = new BlockchainDataService();

  try {
    console.log(`1️⃣ Testing getWalletInfo for ${address}...`);
    const walletInfo = await blockchainService.getWalletInfo(address, 'ethereum');
    console.log('✅ Wallet Info:', JSON.stringify(walletInfo, null, 2));

    console.log('\n2️⃣ Testing getBalanceFromRpc for ${address}...');
    const balance = await blockchainService.getBalanceFromRpc(address, 'ethereum');
    console.log('✅ Balance:', JSON.stringify(balance, null, 2));

    console.log('\n3️⃣ Testing getWalletTransactions for ${address}...');
    try {
      const transactions = await blockchainService.getWalletTransactions(address, 'ethereum', 1, 10);
      console.log('✅ Transactions:', JSON.stringify(transactions, null, 2));
    } catch (error) {
      console.log('❌ Transactions Error:', error.message);
    }

    console.log('\n4️⃣ Testing getRateLimitStatus...');
    const rateLimit = await blockchainService.getRateLimitStatus('ethereum');
    console.log('✅ Rate Limit Status:', JSON.stringify(rateLimit, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealAddress(); 
 
 