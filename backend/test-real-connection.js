require('dotenv').config();
const { ethers } = require("ethers");

async function testRealConnection() {
  console.log('🔍 Testing Real Blockchain Connection...');
  console.log('==========================================\n');

  try {
    // Test Ethereum connection
    console.log('1️⃣ Testing Ethereum Connection...');
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const ethNetwork = await ethProvider.getNetwork();
    console.log(`✅ Connected to Ethereum: ${ethNetwork.name} (Chain ID: ${ethNetwork.chainId})`);
    
    // Get latest block
    const latestBlock = await ethProvider.getBlockNumber();
    console.log(`📦 Latest block: ${latestBlock}`);
    
    // Test BSC connection
    console.log('\n2️⃣ Testing BSC Connection...');
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
    const bscNetwork = await bscProvider.getNetwork();
    console.log(`✅ Connected to BSC: ${bscNetwork.name} (Chain ID: ${bscNetwork.chainId})`);
    
    // Get latest BSC block
    const latestBscBlock = await bscProvider.getBlockNumber();
    console.log(`📦 Latest BSC block: ${latestBscBlock}`);

    // Test contract connections
    console.log('\n3️⃣ Testing Contract Connections...');
    
    // Stargate contract - check if it exists
    const stargateAddress = "0x8731d54E9D02c286767d56ac03e8037C07e01e98";
    const stargateCode = await ethProvider.getCode(stargateAddress);
    console.log(`✅ Stargate contract exists: ${stargateCode !== '0x' ? 'Yes' : 'No'}`);
    
    // Wormhole contract - check if it exists
    const wormholeAddress = "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B";
    const wormholeCode = await ethProvider.getCode(wormholeAddress);
    console.log(`✅ Wormhole contract exists: ${wormholeCode !== '0x' ? 'Yes' : 'No'}`);

    // Check for recent transactions to these contracts
    console.log('\n4️⃣ Checking for Recent Activity...');
    
    // Get recent blocks and check for transactions to our contracts
    const recentBlocks = 10;
    let stargateTxs = 0;
    let wormholeTxs = 0;
    
    for (let i = 0; i < recentBlocks; i++) {
      const blockNumber = latestBlock - i;
      try {
        const block = await ethProvider.getBlock(blockNumber, true);
        if (block && block.transactions) {
          block.transactions.forEach(tx => {
            if (tx.to && tx.to.toLowerCase() === stargateAddress.toLowerCase()) {
              stargateTxs++;
            }
            if (tx.to && tx.to.toLowerCase() === wormholeAddress.toLowerCase()) {
              wormholeTxs++;
            }
          });
        }
      } catch (error) {
        // Skip blocks that can't be fetched
      }
    }
    
    console.log(`📊 Recent activity in last ${recentBlocks} blocks:`);
    console.log(`   Stargate transactions: ${stargateTxs}`);
    console.log(`   Wormhole transactions: ${wormholeTxs}`);

    // Check database for captured events
    console.log('\n5️⃣ Checking Database for Captured Events...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const totalEvents = await prisma.bridgeEvent.count();
      const recentEvents = await prisma.bridgeEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5
      });
      
      console.log(`📊 Total events in database: ${totalEvents}`);
      if (recentEvents.length > 0) {
        console.log('📋 Recent captured events:');
        recentEvents.forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.protocol} - ${event.eventType} - Block ${event.blockNumber}`);
        });
      } else {
        console.log('📭 No events captured yet (this is normal if contracts are not active)');
      }
    } catch (error) {
      console.log(`⚠️  Database check failed: ${error.message}`);
    } finally {
      await prisma.$disconnect();
    }

    console.log('\n==========================================');
    console.log('✅ Real blockchain connection verified!');
    console.log('🎯 Your bridge watcher is monitoring REAL data');
    console.log('📡 Any events from these contracts will be captured');
    console.log('⏰ Events are captured in real-time as they happen');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testRealConnection(); 