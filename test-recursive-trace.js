import fetch from 'node-fetch';

async function testRecursiveTransactionTrace() {
  const hash = '0x7c0cb99a162398e7b2991890bb0ad9914b4f7a5a8df6ab0fe963f7fc86978564';
  const depth = 2; // Test with depth 2
  
  try {
    console.log(`🔍 Testing recursive transaction tracing for: ${hash}`);
    console.log(`📊 Depth: ${depth}`);
    console.log('⏳ This may take a few moments...\n');
    
    // Test the new deep trace endpoint
    const response = await fetch(`http://localhost:3001/api/tracing/trace-deep/${hash}?depth=${depth}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const traceData = result.data;
      
      console.log('✅ Recursive trace completed successfully!');
      console.log('\n📊 Trace Summary:');
      console.log(`  Original Hash: ${traceData.originalHash}`);
      console.log(`  Trace ID: ${traceData.traceId}`);
      console.log(`  Depth: ${traceData.depth}`);
      console.log(`  Total Transactions: ${traceData.totalTransactions}`);
      console.log(`  Visited Addresses: ${traceData.visitedAddresses}`);
      console.log(`  Timestamp: ${traceData.timestamp}`);
      
      console.log('\n🎯 Risk Metrics:');
      console.log(`  Risk Level: ${traceData.riskMetrics.riskLevel}/100`);
      console.log(`  Risk Flags: ${traceData.riskMetrics.riskFlags.join(', ') || 'None'}`);
      console.log(`  Total Volume: ${traceData.riskMetrics.totalVolume} ETH`);
      console.log(`  Unique Addresses: ${traceData.riskMetrics.uniqueAddresses}`);
      console.log(`  Max Depth Reached: ${traceData.riskMetrics.maxDepth}`);
      
      console.log('\n🔗 Transaction Chain:');
      traceData.transactions.forEach((tx, index) => {
        console.log(`\n  Transaction ${index + 1} (Depth ${tx.depth}):`);
        console.log(`    Hash: ${tx.hash}`);
        console.log(`    From: ${tx.from}`);
        console.log(`    To: ${tx.to}`);
        console.log(`    Amount: ${tx.valueFormatted} ETH`);
        console.log(`    Block: ${tx.blockNumber}`);
        console.log(`    Gas Used: ${tx.gasUsed}`);
        console.log(`    Timestamp: ${new Date(tx.timestamp * 1000).toISOString()}`);
      });
      
    } else {
      console.log('❌ Trace failed:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Error testing recursive trace:', error.message);
  }
}

async function testSimpleTrace() {
  const hash = '0x7c0cb99a162398e7b2991890bb0ad9914b4f7a5a8df6ab0fe963f7fc86978564';
  
  try {
    console.log(`\n🔍 Testing simple trace (depth=1) for: ${hash}`);
    
    const response = await fetch(`http://localhost:3001/api/tracing/trace/${hash}?depth=1`);
    const result = await response.json();
    
    console.log('✅ Simple trace result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing simple trace:', error.message);
  }
}

// Run both tests
async function runTests() {
  await testRecursiveTransactionTrace();
  await testSimpleTrace();
}

runTests(); 