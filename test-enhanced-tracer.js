import fetch from 'node-fetch';

async function testEnhancedTracer() {
  const hash = '0x7c0cb99a162398e7b2991890bb0ad9914b4f7a5a8df6ab0fe963f7fc86978564';
  
  console.log('🚀 Testing Enhanced Advanced Transaction Tracer\n');
  
  // Test 1: Single chain advanced trace
  console.log('1️⃣ Testing Single Chain Advanced Trace (Ethereum)');
  try {
    const response = await fetch(`http://localhost:3001/api/tracing/advanced/${hash}?depth=2&chain=ethereum`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Advanced trace completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   Total Transactions: ${result.summary.totalTransactions}`);
      console.log(`   Visited Addresses: ${result.summary.visitedAddresses}`);
      console.log(`   Max Depth: ${result.summary.maxDepth}`);
      console.log(`   Average Risk Level: ${result.summary.averageRiskLevel.toFixed(2)}`);
      
      console.log(`\n🎯 Risk Metrics:`);
      console.log(`   Overall Risk Level: ${result.riskMetrics.overallRiskLevel}/100`);
      console.log(`   High Risk Transactions: ${result.riskMetrics.highRiskTransactions}`);
      console.log(`   Bridge Interactions: ${result.riskMetrics.bridgeInteractions}`);
      console.log(`   Mixer Interactions: ${result.riskMetrics.mixerInteractions}`);
      console.log(`   DEX Interactions: ${result.riskMetrics.dexInteractions}`);
      console.log(`   Total Volume: ${result.riskMetrics.totalVolume} ETH`);
      
      console.log(`\n📈 Risk Distribution:`);
      Object.entries(result.riskMetrics.riskDistribution).forEach(([category, count]) => {
        console.log(`   ${category}: ${count} transactions`);
      });
      
      if (result.flat.length > 0) {
        console.log(`\n🔗 Sample Transactions:`);
        result.flat.slice(0, 3).forEach((tx, index) => {
          console.log(`   ${index + 1}. ${tx.hash.substring(0, 10)}... (Risk: ${tx.riskLevel}, Tags: ${tx.riskTags.join(', ')})`);
        });
      }
    } else {
      console.log('❌ Advanced trace failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing advanced trace:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Multi-chain trace
  console.log('2️⃣ Testing Multi-Chain Trace');
  try {
    const response = await fetch(`http://localhost:3001/api/tracing/multi-chain/${hash}?depth=1&chains=ethereum,bsc`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Multi-chain trace completed successfully!');
      console.log(`📊 Results by Chain:`);
      
      Object.entries(result.results).forEach(([chain, chainResult]) => {
        if (chainResult.error) {
          console.log(`   ${chain}: ❌ ${chainResult.error}`);
        } else {
          console.log(`   ${chain}: ✅ ${chainResult.summary.totalTransactions} transactions, Risk: ${chainResult.riskMetrics.overallRiskLevel}/100`);
        }
      });
    } else {
      console.log('❌ Multi-chain trace failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing multi-chain trace:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Performance test
  console.log('3️⃣ Testing Performance (Cache Efficiency)');
  try {
    const startTime = Date.now();
    const response = await fetch(`http://localhost:3001/api/tracing/advanced/${hash}?depth=1&chain=ethereum`);
    const result = await response.json();
    const endTime = Date.now();
    
    if (result.success) {
      console.log(`✅ Trace completed in ${endTime - startTime}ms`);
      console.log(`📊 Cache size: ${result.metadata.cacheSize} items`);
      console.log(`🔧 Chain: ${result.metadata.chain}`);
      console.log(`📏 Depth: ${result.metadata.depth}`);
    }
  } catch (error) {
    console.error('❌ Error testing performance:', error.message);
  }
}

testEnhancedTracer(); 