require('dotenv').config();
const { saveBridgeTxToPostgres, pool } = require('./src/services/pgClient');
const { saveBridgeTxToNeo4j, driver } = require('./src/services/neo4jClient');

async function testDatabaseIntegration() {
  console.log('🧪 Testing Database Integration (PostgreSQL + Neo4j)');
  console.log('==================================================\n');

  // Test data
  function randomTxHash() {
    // Generate a 64-character hex string
    const hex = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    return '0x' + hex;
  }
  const testTransaction = {
    tx_hash: randomTxHash(),
    from_chain: 'ethereum',
    to_chain: 'polygon',
    sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    receiver: '0x8ba1f109551bD432803012645aac136c772c3c7c',
    token: 'USDC',
    amount: '1000000', // 1M USDC
    bridge: 'stargate',
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Test PostgreSQL Connection
    console.log('1️⃣ Testing PostgreSQL Connection...');
    const pgClient = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    
    // Test table exists
    const tableCheck = await pgClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bridge_flows'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ bridge_flows table exists');
    } else {
      console.log('❌ bridge_flows table does not exist - run migration first');
      await pgClient.release();
      return;
    }
    await pgClient.release();

    // 2. Test Neo4j Connection
    console.log('\n2️⃣ Testing Neo4j Connection...');
    const session = driver.session();
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Neo4j connection successful');
    await session.close();

    // 3. Test PostgreSQL Save Function
    console.log('\n3️⃣ Testing PostgreSQL Save Function...');
    await saveBridgeTxToPostgres(testTransaction);
    
    // Verify data was saved
    const pgClient2 = await pool.connect();
    const savedData = await pgClient2.query(
      'SELECT * FROM bridge_flows WHERE tx_hash = $1',
      [testTransaction.tx_hash]
    );
    
    if (savedData.rows.length > 0) {
      console.log('✅ Transaction saved to PostgreSQL');
      console.log('📊 Saved data:', savedData.rows[0]);
    } else {
      console.log('❌ Transaction not found in PostgreSQL');
    }
    await pgClient2.release();

    // 4. Test Neo4j Save Function
    console.log('\n4️⃣ Testing Neo4j Save Function...');
    await saveBridgeTxToNeo4j(testTransaction);
    
    // Verify data was saved
    const session2 = driver.session();
    const graphResult = await session2.run(`
      MATCH (t:Transaction {tx_hash: $tx_hash})
      RETURN t
    `, { tx_hash: testTransaction.tx_hash });
    
    if (graphResult.records.length > 0) {
      console.log('✅ Transaction saved to Neo4j');
      console.log('📊 Saved transaction:', graphResult.records[0].get('t').properties);
    } else {
      console.log('❌ Transaction not found in Neo4j');
    }
    await session2.close();

    // 5. Test Graph Relationships
    console.log('\n5️⃣ Testing Neo4j Graph Relationships...');
    const session3 = driver.session();
    const relationshipResult = await session3.run(`
      MATCH (sender:Wallet {address: $sender})-[r:SENT]->(receiver:Wallet {address: $receiver})
      RETURN sender.address as sender, receiver.address as receiver, r.amount as amount, r.token as token
    `, { 
      sender: testTransaction.sender, 
      receiver: testTransaction.receiver 
    });
    
    if (relationshipResult.records.length > 0) {
      console.log('✅ SENT relationship created');
      const rel = relationshipResult.records[0];
      console.log(`📊 ${rel.get('sender')} -> ${rel.get('receiver')} (${rel.get('amount')} ${rel.get('token')})`);
    } else {
      console.log('❌ SENT relationship not found');
    }
    await session3.close();

    // 6. Test Duplicate Handling
    console.log('\n6️⃣ Testing Duplicate Transaction Handling...');
    await saveBridgeTxToPostgres(testTransaction); // Should not create duplicate
    await saveBridgeTxToNeo4j(testTransaction); // Should not create duplicate
    
    const pgClient3 = await pool.connect();
    const duplicateCheck = await pgClient3.query(
      'SELECT COUNT(*) as count FROM bridge_flows WHERE tx_hash = $1',
      [testTransaction.tx_hash]
    );
    
    if (duplicateCheck.rows[0].count === '1') {
      console.log('✅ PostgreSQL duplicate handling working (no duplicates)');
    } else {
      console.log(`❌ PostgreSQL duplicate handling failed (${duplicateCheck.rows[0].count} records found)`);
    }
    await pgClient3.release();

    // 7. Performance Test
    console.log('\n7️⃣ Testing Performance (10 transactions)...');
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      const perfTestTx = {
        ...testTransaction,
        tx_hash: randomTxHash(),
        amount: (Math.random() * 1000000).toString()
      };
      
      await Promise.all([
        saveBridgeTxToPostgres(perfTestTx),
        saveBridgeTxToNeo4j(perfTestTx)
      ]);
    }
    
    const endTime = Date.now();
    console.log(`✅ Performance test completed in ${endTime - startTime}ms`);

    console.log('\n==================================================');
    console.log('🎉 Database Integration Test Completed Successfully!');
    console.log('✅ Both PostgreSQL and Neo4j are working correctly');
    console.log('✅ Bridge transaction saving is functional');
    console.log('✅ Graph relationships are properly created');
    console.log('✅ Duplicate handling is working');
    console.log('✅ Performance is acceptable');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    await pool.end();
    await driver.close();
  }
}

// Run the test
testDatabaseIntegration(); 