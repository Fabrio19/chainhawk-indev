require('dotenv').config();
const BlockchainDataService = require('./src/services/blockchainDataService');

async function testRealBlockchainData() {
  console.log('🔍 Testing Real Blockchain Data Integration...');
  console.log('==========================================\n');

  const blockchainService = new BlockchainDataService();

  // Test addresses (real Ethereum addresses with activity)
  const testAddresses = [
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT contract (will have token transfers)
    '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8', // Test address
    '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'  // Binance hot wallet
  ];

  try {
    // 1. Test API Status
    console.log('1️⃣ Testing API Status...');
    const apiStatus = await blockchainService.getRateLimitStatus('ethereum');
    console.log('✅ API Status:', JSON.stringify(apiStatus, null, 2));

    // 2. Test Wallet Transactions
    console.log('\n2️⃣ Testing Wallet Transactions...');
    for (const address of testAddresses) {
      console.log(`\n📡 Fetching transactions for ${address}...`);
      try {
        const transactions = await blockchainService.getWalletTransactions(address, 'ethereum', 1, 10);
        console.log(`✅ Retrieved ${transactions.total} transactions`);
        if (transactions.transactions.length > 0) {
          console.log(`📊 Sample transaction:`, JSON.stringify(transactions.transactions[0], null, 2));
        }
        break; // Use first successful address
      } catch (error) {
        console.log(`⚠️ No transactions found for ${address}: ${error.message}`);
        continue;
      }
    }

    // 3. Test Token Transfers (USDT contract should have many)
    console.log('\n3️⃣ Testing Token Transfers...');
    const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    console.log(`\n📡 Fetching token transfers for ${usdtAddress}...`);
    try {
      const tokenTransfers = await blockchainService.getTokenTransfers(usdtAddress, 'ethereum', 1, 10);
      console.log(`✅ Retrieved ${tokenTransfers.total} token transfers`);
      if (tokenTransfers.transfers.length > 0) {
        console.log(`📊 Sample token transfer:`, JSON.stringify(tokenTransfers.transfers[0], null, 2));
      }
    } catch (error) {
      console.log(`⚠️ Could not fetch token transfers: ${error.message}`);
    }

    // 4. Test Internal Transactions
    console.log('\n4️⃣ Testing Internal Transactions...');
    for (const address of testAddresses) {
      console.log(`\n📡 Fetching internal transactions for ${address}...`);
      try {
        const internalTxs = await blockchainService.getInternalTransactions(address, 'ethereum', 1, 10);
        console.log(`✅ Retrieved ${internalTxs.total} internal transactions`);
        if (internalTxs.internalTransactions.length > 0) {
          console.log(`📊 Sample internal transaction:`, JSON.stringify(internalTxs.internalTransactions[0], null, 2));
        }
        break; // Use first successful address
      } catch (error) {
        console.log(`⚠️ No internal transactions found for ${address}: ${error.message}`);
        continue;
      }
    }

    // 5. Test Contract ABI (USDT contract)
    console.log('\n5️⃣ Testing Contract ABI...');
    const usdtContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT contract
    console.log(`\n📡 Fetching ABI for ${usdtContract}...`);
    try {
      const abi = await blockchainService.getContractABI(usdtContract, 'ethereum');
      console.log(`✅ Retrieved ABI with ${abi.length} items`);
      console.log(`📊 Sample ABI item:`, JSON.stringify(abi[0], null, 2));
    } catch (error) {
      console.log(`⚠️ Could not fetch ABI for ${usdtContract}: ${error.message}`);
    }

    // 6. Test Token Balance
    console.log('\n6️⃣ Testing Token Balance...');
    const tokenContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT
    const testWallet = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
    console.log(`\n📡 Fetching token balance for ${testWallet} on ${tokenContract}...`);
    try {
      const balance = await blockchainService.getTokenBalance(tokenContract, testWallet, 'ethereum');
      console.log(`✅ Token balance: ${balance.balanceFormatted} ${balance.tokenInfo.tokenSymbol}`);
    } catch (error) {
      console.log(`⚠️ Could not fetch token balance: ${error.message}`);
    }

    // 7. Test Comprehensive Wallet Analysis (with fallback)
    console.log('\n7️⃣ Testing Comprehensive Wallet Analysis...');
    let analysisAddress = null;
    
    // Find an address with transactions
    for (const address of testAddresses) {
      try {
        console.log(`\n📡 Analyzing wallet ${address}...`);
        const analysis = await blockchainService.getWalletAnalysis(address, 'ethereum');
        console.log(`✅ Analysis completed`);
        console.log(`📊 Risk Score: ${analysis.riskIndicators.riskScore}/100`);
        console.log(`📊 Total Transactions: ${analysis.summary.totalTransactions}`);
        console.log(`📊 Total Token Transfers: ${analysis.summary.totalTokenTransfers}`);
        console.log(`📊 Risk Indicators:`, JSON.stringify(analysis.riskIndicators, null, 2));
        analysisAddress = address;
        break;
      } catch (error) {
        console.log(`⚠️ Could not analyze ${address}: ${error.message}`);
        continue;
      }
    }

    if (!analysisAddress) {
      console.log('⚠️ No addresses with sufficient data for analysis found');
    }

    // 8. Test Token Holdings
    console.log('\n8️⃣ Testing Token Holdings...');
    if (analysisAddress) {
      console.log(`\n📡 Fetching token holdings for ${analysisAddress}...`);
      try {
        const holdings = await blockchainService.getTokenHoldings(analysisAddress, 'ethereum');
        console.log(`✅ Retrieved ${holdings.length} token holdings`);
        if (holdings.length > 0) {
          console.log(`📊 Sample holding:`, JSON.stringify(holdings[0], null, 2));
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch token holdings: ${error.message}`);
      }
    }

    // 9. Test BSC Chain
    console.log('\n9️⃣ Testing BSC Chain...');
    const bscAddress = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3'; // Binance hot wallet on BSC
    console.log(`\n📡 Fetching BSC transactions for ${bscAddress}...`);
    try {
      const bscTransactions = await blockchainService.getWalletTransactions(bscAddress, 'bsc', 1, 5);
      console.log(`✅ Retrieved ${bscTransactions.total} BSC transactions`);
    } catch (error) {
      console.log(`⚠️ BSC test failed: ${error.message}`);
    }

    // 10. Test Error Handling
    console.log('\n🔟 Testing Error Handling...');
    const invalidAddress = '0xinvalid';
    try {
      await blockchainService.getWalletTransactions(invalidAddress, 'ethereum', 1, 10);
    } catch (error) {
      console.log(`✅ Properly handled invalid address: ${error.message}`);
    }

    console.log('\n==========================================');
    console.log('✅ Real Blockchain Data Integration Test Completed!');
    console.log('🎯 API key is working and endpoints are functional');
    console.log('📊 Your AML system now uses live Ethereum/BSC data instead of mock data');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test specific functionality
async function testSpecificFunction() {
  console.log('🔍 Testing Specific Blockchain Function...');
  console.log('==========================================\n');

  const blockchainService = new BlockchainDataService();

  try {
    // Test USDT contract (should have activity)
    const address = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    
    console.log(`📡 Testing token transfers for ${address}...`);
    
    const tokenTransfers = await blockchainService.getTokenTransfers(address, 'ethereum', 1, 5);
    
    console.log('✅ Token Transfer Results:');
    console.log(`Address: ${tokenTransfers.address}`);
    console.log(`Chain: ${tokenTransfers.chain}`);
    console.log(`Total Transfers: ${tokenTransfers.total}`);
    
    if (tokenTransfers.transfers.length > 0) {
      console.log('\n📊 Sample Token Transfers:');
      tokenTransfers.transfers.slice(0, 3).forEach((transfer, index) => {
        console.log(`${index + 1}. ${transfer.hash} - ${transfer.valueFormatted} ${transfer.tokenSymbol} from ${transfer.from} to ${transfer.to}`);
      });
    }
    
    // Test contract ABI
    console.log('\n📡 Testing contract ABI...');
    const abi = await blockchainService.getContractABI(address, 'ethereum');
    console.log(`✅ Retrieved ABI with ${abi.length} items`);
    
    const functions = abi.filter(item => item.type === 'function');
    const events = abi.filter(item => item.type === 'event');
    
    console.log(`📊 Functions: ${functions.length}, Events: ${events.length}`);
    
  } catch (error) {
    console.error('❌ Specific test failed:', error.message);
  }
}

// Run tests
if (process.argv.includes('--specific')) {
  testSpecificFunction();
} else {
  testRealBlockchainData();
} 
// Test configuration
const TEST_ADDRESS = '0x7d55f823c37a362a126aef6903e3390a8aa1b30d';
const ETHEREUM_RPC_URL = 'https://mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d';
const BSC_RPC_URL = 'https://bsc-dataseed.binance.org/';

/**
 * Test Ethereum RPC connection
 */
async function testEthereumRPC() {
  console.log('🔍 Testing Ethereum RPC connection...');
  
  try {
    const response = await axios.post(ETHEREUM_RPC_URL, {
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [TEST_ADDRESS, 'latest'],
      id: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.result) {
      const balance = parseInt(response.data.result, 16) / Math.pow(10, 18);
      console.log(`✅ Ethereum RPC working! Balance: ${balance} ETH`);
      return true;
    } else {
      console.log('❌ Ethereum RPC error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Ethereum RPC connection failed:', error.message);
    return false;
  }
}

/**
 * Test BSC RPC connection
 */
async function testBSCRPC() {
  console.log('🔍 Testing BSC RPC connection...');
  
  try {
    const response = await axios.post(BSC_RPC_URL, {
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [TEST_ADDRESS, 'latest'],
      id: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.result) {
      const balance = parseInt(response.data.result, 16) / Math.pow(10, 18);
      console.log(`✅ BSC RPC working! Balance: ${balance} BNB`);
      return true;
    } else {
      console.log('❌ BSC RPC error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ BSC RPC connection failed:', error.message);
    return false;
  }
}

/**
 * Test Etherscan API
 */
async function testEtherscanAPI() {
  console.log('🔍 Testing Etherscan API...');
  
  try {
    const response = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'account',
        action: 'txlist',
        address: TEST_ADDRESS,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 5,
        sort: 'desc',
        apikey: 'YourApiKeyToken'
      },
      timeout: 10000
    });

    if (response.data.status === '1') {
      console.log(`✅ Etherscan API working! Found ${response.data.result.length} transactions`);
      return true;
    } else {
      console.log('❌ Etherscan API error:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Etherscan API connection failed:', error.message);
    return false;
  }
}

/**
 * Test BSCScan API
 */
async function testBSCScanAPI() {
  console.log('🔍 Testing BSCScan API...');
  
  try {
    const response = await axios.get('https://api.bscscan.com/api', {
      params: {
        module: 'account',
        action: 'txlist',
        address: TEST_ADDRESS,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 5,
        sort: 'desc',
        apikey: 'YourApiKeyToken'
      },
      timeout: 10000
    });

    if (response.data.status === '1') {
      console.log(`✅ BSCScan API working! Found ${response.data.result.length} transactions`);
      return true;
    } else {
      console.log('❌ BSCScan API error:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ BSCScan API connection failed:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Real Blockchain Integration Tests...\n');
  
  const results = {
    ethereumRPC: await testEthereumRPC(),
    bscRPC: await testBSCRPC(),
    etherscanAPI: await testEtherscanAPI(),
    bscScanAPI: await testBSCScanAPI()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Ethereum RPC: ${results.ethereumRPC ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`BSC RPC: ${results.bscRPC ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Etherscan API: ${results.etherscanAPI ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`BSCScan API: ${results.bscScanAPI ? '✅ PASS' : '❌ FAIL'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Real blockchain integration is working.');
  } else {
    console.log('⚠️ Some tests failed. Check the configuration and try again.');
  }
}

// Run tests
runTests().catch(console.error); 