const { USDTTracingService } = require('./src/services/usdtTracingService');

async function testUSDTTracing() {
  console.log('🧪 Testing USDT Tracing Service...\n');
  
  const usdtTracingService = new USDTTracingService();
  
  // Test address (you can replace with any address that has USDT activity)
  const testAddress = '0x8894e0a0c962cb723c1976a4421c95949be2d4e3'; // Binance hot wallet
  
  try {
    // Test 1: Single-chain USDT tracing (BSC)
    console.log('📋 Test 1: Single-chain USDT tracing on BSC');
    console.log('=' .repeat(50));
    
    const singleChainResult = await usdtTracingService.traceUSDTTransfers(testAddress, 'bsc', {
      limit: 10,
      includeZeroTransfers: false
    });
    
    console.log(`✅ Found ${singleChainResult.totalTransfers} total transfers`);
    console.log(`📊 Limited to ${singleChainResult.limitedTransfers.length} transfers`);
    console.log(`🔗 Chain: ${singleChainResult.chain}`);
    console.log(`📦 Block range: ${singleChainResult.blockRange.from} → ${singleChainResult.blockRange.to}`);
    
    if (singleChainResult.limitedTransfers.length > 0) {
      console.log('\n📄 Sample transfers:');
      singleChainResult.limitedTransfers.slice(0, 3).forEach((transfer, index) => {
        console.log(`  ${index + 1}. ${transfer.from} → ${transfer.to}`);
        console.log(`     Amount: ${transfer.valueFormatted} USDT`);
        console.log(`     Block: ${transfer.blockNumber}`);
        console.log(`     TX: ${transfer.transactionHash}`);
        console.log('');
      });
    }
    
    // Test 2: Multi-chain USDT tracing
    console.log('\n📋 Test 2: Multi-chain USDT tracing');
    console.log('=' .repeat(50));
    
    const multiChainResult = await usdtTracingService.traceUSDTMultiChain(testAddress, ['bsc', 'ethereum'], {
      limit: 5
    });
    
    console.log(`🌐 Traced across ${multiChainResult.chains.length} chains: ${multiChainResult.chains.join(', ')}`);
    
    Object.entries(multiChainResult.results).forEach(([chain, result]) => {
      if (result.error) {
        console.log(`❌ ${chain}: ${result.error}`);
      } else {
        console.log(`✅ ${chain}: ${result.totalTransfers} transfers found`);
      }
    });
    
    // Test 3: USDT balance check
    console.log('\n📋 Test 3: USDT balance check');
    console.log('=' .repeat(50));
    
    const balanceResult = await usdtTracingService.getUSDTBalance(testAddress, 'bsc');
    
    console.log(`💰 Address: ${balanceResult.address}`);
    console.log(`🔗 Chain: ${balanceResult.chain}`);
    console.log(`💎 Balance: ${balanceResult.balanceFormatted} USDT`);
    console.log(`📊 Raw balance: ${balanceResult.balance}`);
    
    // Test 4: Chunked log fetching with specific block range
    console.log('\n📋 Test 4: Chunked log fetching with specific block range');
    console.log('=' .repeat(50));
    
    const latestBlock = await usdtTracingService.providers.bsc.makeRpcCall('eth_blockNumber', []);
    const latestBlockNum = parseInt(latestBlock, 16);
    const fromBlock = latestBlockNum - 1000; // Last 1000 blocks
    const toBlock = latestBlockNum;
    
    console.log(`🔍 Fetching USDT logs from block ${fromBlock} to ${toBlock}`);
    
    const logs = await usdtTracingService.fetchUSDTLogsChunked({
      chain: 'bsc',
      fromBlock: fromBlock,
      toBlock: toBlock,
      step: 250,
      address: testAddress
    });
    
    console.log(`✅ Total logs fetched: ${logs.length}`);
    
    if (logs.length > 0) {
      console.log('\n📄 Sample logs:');
      logs.slice(0, 3).forEach((log, index) => {
        const fromAddress = '0x' + log.topics[1].slice(26);
        const toAddress = '0x' + log.topics[2].slice(26);
        const value = parseInt(log.data, 16);
        
        console.log(`  ${index + 1}. ${fromAddress} → ${toAddress}`);
        console.log(`     Value: ${(value / Math.pow(10, 6)).toFixed(6)} USDT`);
        console.log(`     Block: ${parseInt(log.blockNumber, 16)}`);
        console.log(`     TX: ${log.transactionHash}`);
        console.log('');
      });
    }
    
    console.log('🎉 All USDT tracing tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testUSDTTracing().then(() => {
  console.log('\n🏁 Test script finished');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
}); 