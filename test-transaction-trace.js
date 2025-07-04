import fetch from 'node-fetch';

async function testTransactionTrace() {
  const hash = '0x7c0cb99a162398e7b2991890bb0ad9914b4f7a5a8df6ab0fe963f7fc86978564';
  
  try {
    console.log(`🔍 Tracing transaction: ${hash}`);
    
    const response = await fetch(`http://localhost:3001/api/tracing/trace/${hash}`);
    const data = await response.json();
    
    console.log('✅ Transaction trace results:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data && data.length > 0) {
      console.log('\n📊 Transaction Summary:');
      data.forEach((tx, index) => {
        console.log(`\nTransaction ${index + 1}:`);
        console.log(`  Hash: ${tx.hash}`);
        console.log(`  From: ${tx.from}`);
        console.log(`  To: ${tx.to}`);
        console.log(`  Amount: ${tx.valueFormatted} ${tx.currency || 'ETH'}`);
        console.log(`  Block: ${tx.blockNumber}`);
        console.log(`  Gas Used: ${tx.gasUsed}`);
        console.log(`  Chain: ${tx.chain}`);
        console.log(`  Timestamp: ${new Date(tx.timestamp * 1000).toISOString()}`);
      });
    } else {
      console.log('❌ No transaction data found');
    }
    
  } catch (error) {
    console.error('❌ Error tracing transaction:', error.message);
  }
}

testTransactionTrace(); 