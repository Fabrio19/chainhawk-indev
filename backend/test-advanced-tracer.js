const { traceAdvanced } = require('./src/services/advancedTracer');
const { ChainProvider } = require('./src/services/chainProviders');

async function testAdvancedTracer() {
  console.log('🧪 Testing Advanced Transaction Tracer with RPC...\n');
  
  // Using the provided ERC20 transaction hash
  const testHash = '0xa1f454b92574787d1cd0d84d2a2c0c751b800685adc75d49269b1fc1fb328d06';
  
  try {
    // First, let's verify the transaction exists
    console.log('🔍 Verifying transaction exists...');
    const provider = new ChainProvider('ethereum');
    const tx = await provider.getTxDetails(testHash);
    
    if (!tx) {
      console.error('❌ Transaction not found!');
      return;
    }
    
    console.log('✅ Transaction found!');
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Value: ${provider.formatValue(tx.value)} ETH`);
    console.log(`   Block: ${tx.blockNumber}`);
    
    // Check if the 'to' address has other transactions
    if (tx.to) {
      console.log('\n🔍 Checking outgoing transactions from destination address...');
      const outgoingTxs = await provider.getAddressTxs(tx.to, 10, tx.blockNumber ? parseInt(tx.blockNumber, 16) : null);
      console.log(`   Found ${outgoingTxs.length} outgoing transactions`);
      
      if (outgoingTxs.length > 0 && Array.isArray(outgoingTxs)) {
        console.log('   Sample outgoing transactions:');
        outgoingTxs.slice(0, 3).forEach((outTx, index) => {
          console.log(`     ${index + 1}. ${outTx.hash.slice(0, 8)}... → ${outTx.to.slice(0, 8)}... (${provider.formatValue(outTx.value)} ETH)`);
        });
      }
    }
    
    // Check if the 'from' address has other transactions
    if (tx.from) {
      console.log('\n🔍 Checking incoming transactions to source address...');
      const incomingTxs = await provider.getAddressTxs(tx.from, 10, tx.blockNumber ? parseInt(tx.blockNumber, 16) : null);
      console.log(`   Found ${incomingTxs.length} incoming transactions`);
      
      if (incomingTxs.length > 0 && Array.isArray(incomingTxs)) {
        console.log('   Sample incoming transactions:');
        incomingTxs.slice(0, 3).forEach((inTx, index) => {
          console.log(`     ${index + 1}. ${inTx.hash.slice(0, 8)}... → ${inTx.to.slice(0, 8)}... (${provider.formatValue(inTx.value)} ETH)`);
        });
      }
    }
    
    console.log('\n🚀 Starting advanced trace...');
    console.log('📊 Using depth: 3, chain: ethereum\n');
    
    const startTime = Date.now();
    const result = await traceAdvanced(testHash, { 
      maxDepth: 3, 
      chain: 'ethereum' 
    });
    const endTime = Date.now();
    
    console.log('✅ Trace completed successfully!');
    console.log(`⏱️  Execution time: ${endTime - startTime}ms\n`);
    
    console.log('📈 Trace Summary:');
    console.log(`   Total Transactions: ${result.summary.totalTransactions}`);
    console.log(`   Visited Addresses: ${result.summary.visitedAddresses}`);
    console.log(`   Max Depth: ${result.summary.maxDepth}`);
    console.log(`   Chains: ${result.summary.chains.join(', ')}`);
    console.log(`   Average Risk Level: ${result.summary.averageRiskLevel.toFixed(2)}`);
    
    console.log('\n🎯 Risk Metrics:');
    console.log(`   Overall Risk Level: ${result.riskMetrics.overallRiskLevel}`);
    console.log(`   High Risk Transactions: ${result.riskMetrics.highRiskTransactions}`);
    console.log(`   Total Volume: ${result.riskMetrics.totalVolume} ETH`);
    console.log(`   Bridge Interactions: ${result.riskMetrics.bridgeInteractions}`);
    console.log(`   Mixer Interactions: ${result.riskMetrics.mixerInteractions}`);
    console.log(`   DEX Interactions: ${result.riskMetrics.dexInteractions}`);
    
    if (result.flat && result.flat.length > 0) {
      console.log('\n📋 Sample Transactions:');
      result.flat.slice(0, 5).forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.hash.slice(0, 8)}... → ${tx.to.slice(0, 8)}... (${tx.amount} ${tx.token}) - Risk: ${tx.riskLevel}`);
        if (tx.erc20Transfers && tx.erc20Transfers.length > 0) {
          console.log(`      ERC20 Transfers: ${tx.erc20Transfers.length}`);
        }
        if (tx.erc721Transfers && tx.erc721Transfers.length > 0) {
          console.log(`      ERC721 Transfers: ${tx.erc721Transfers.length}`);
        }
      });
      
      if (result.flat.length > 5) {
        console.log(`   ... and ${result.flat.length - 5} more transactions`);
      }
    } else {
      console.log('\n⚠️  No transactions found in flat array!');
    }
    
    console.log('\n🎉 Advanced tracer test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing advanced tracer:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testAdvancedTracer(); 