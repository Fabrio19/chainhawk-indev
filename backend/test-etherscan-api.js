const axios = require('axios');

async function testEtherscanAPI() {
  console.log('🧪 Testing Etherscan API...\n');
  
  // Test with a known recent transaction
  const testHash = '0x2f1e2e6e7e4b2e2e7e4b2e2e7e4b2e2e7e4b2e2e7e4b2e2e7e4b2e2e7e4b2e2e';
  const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
  
  try {
    console.log(`🔍 Testing transaction: ${testHash}`);
    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);
    
    const response = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'proxy',
        action: 'eth_getTransactionByHash',
        txhash: testHash,
        apikey: apiKey,
      },
      timeout: 10000
    });
    
    console.log('✅ API Response received!');
    console.log(`📊 Status: ${response.data.status}`);
    console.log(`📊 Message: ${response.data.message || 'N/A'}`);
    
    if (response.data.result) {
      const tx = response.data.result;
      console.log('\n📋 Transaction Details:');
      console.log(`   Hash: ${tx.hash}`);
      console.log(`   From: ${tx.from}`);
      console.log(`   To: ${tx.to}`);
      console.log(`   Value: ${tx.value}`);
      console.log(`   Block Number: ${tx.blockNumber}`);
      console.log(`   Gas: ${tx.gas}`);
      console.log(`   Gas Price: ${tx.gasPrice}`);
      console.log(`   Nonce: ${tx.nonce}`);
    } else {
      console.log('❌ No transaction result found');
      console.log('Raw response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testEtherscanAPI(); 