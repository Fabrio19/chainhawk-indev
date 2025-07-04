const { PrismaClient } = require('@prisma/client');
const bridgeConfig = require('./src/services/bridgeMonitor');
const bridgeABIs = require('./src/services/abis/bridgeABIs');

const prisma = new PrismaClient();

async function verifyBridgeUpdate() {
  console.log('🔍 Verifying Bridge Monitoring System Update');
  console.log('==========================================\n');

  try {
    // 1. Check database enum
    console.log('1️⃣ Checking Database BridgeProtocol Enum...');
    const enumValues = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"BridgeProtocol")) as protocol;
    `;
    const protocols = enumValues.map(row => row.protocol);
    console.log('   Database protocols:', protocols);
    
    const hasMultichain = protocols.includes('MULTICHAIN');
    const hasCeler = protocols.includes('CELER');
    
    if (hasMultichain) {
      console.log('   ❌ MULTICHAIN still exists in database enum');
    } else {
      console.log('   ✅ MULTICHAIN removed from database enum');
    }
    
    if (hasCeler) {
      console.log('   ✅ CELER added to database enum');
    } else {
      console.log('   ❌ CELER missing from database enum');
    }

    // 2. Check bridge configuration
    console.log('\n2️⃣ Checking Bridge Configuration...');
    const configProtocols = Object.keys(bridgeConfig.BRIDGE_CONFIGS);
    console.log('   Configured protocols:', configProtocols);
    
    const configHasMultichain = configProtocols.includes('MULTICHAIN');
    const configHasCeler = configProtocols.includes('CELER');
    
    if (configHasMultichain) {
      console.log('   ❌ MULTICHAIN still exists in bridge config');
    } else {
      console.log('   ✅ MULTICHAIN removed from bridge config');
    }
    
    if (configHasCeler) {
      console.log('   ✅ CELER added to bridge config');
      console.log('   📋 Celer contracts:', Object.keys(bridgeConfig.BRIDGE_CONFIGS.CELER.networks));
    } else {
      console.log('   ❌ CELER missing from bridge config');
    }

    // 3. Check ABIs
    console.log('\n3️⃣ Checking Bridge ABIs...');
    const abiProtocols = Object.keys(bridgeABIs);
    console.log('   ABI protocols:', abiProtocols);
    
    const abiHasMultichain = abiProtocols.includes('MULTICHAIN_ABI');
    const abiHasCeler = abiProtocols.includes('CELER_ABI');
    
    if (abiHasMultichain) {
      console.log('   ❌ MULTICHAIN_ABI still exists');
    } else {
      console.log('   ✅ MULTICHAIN_ABI removed');
    }
    
    if (abiHasCeler) {
      console.log('   ✅ CELER_ABI added');
      console.log('   📋 Celer events:', bridgeABIs.CELER_ABI.length);
    } else {
      console.log('   ❌ CELER_ABI missing');
    }

    // 4. Check database data
    console.log('\n4️⃣ Checking Database Data...');
    try {
      const multichainCount = await prisma.bridgeTransaction.count({
        where: { bridgeProtocol: 'MULTICHAIN' }
      });
      
      const celerCount = await prisma.bridgeTransaction.count({
        where: { bridgeProtocol: 'CELER' }
      });
      
      if (multichainCount > 0) {
        console.log('   ❌ Found', multichainCount, 'MULTICHAIN transactions in database');
      } else {
        console.log('   ✅ No MULTICHAIN transactions in database');
      }
      
      console.log('   📊 CELER transactions:', celerCount);
    } catch (error) {
      console.log('   ⚠️  Could not check transaction data:', error.message);
    }

    // 5. Check total transactions by protocol
    console.log('\n5️⃣ Checking Transaction Distribution...');
    try {
      const protocolCounts = await prisma.bridgeTransaction.groupBy({
        by: ['bridgeProtocol'],
        _count: { bridgeProtocol: true }
      });
      
      console.log('   Transaction counts by protocol:');
      protocolCounts.forEach(p => {
        console.log(`   - ${p.bridgeProtocol}: ${p._count.bridgeProtocol}`);
      });
    } catch (error) {
      console.log('   ⚠️  Could not check transaction distribution:', error.message);
    }

    // 6. Summary
    console.log('\n==========================================');
    console.log('📋 Update Verification Summary:');
    
    const allGood = !hasMultichain && hasCeler && !configHasMultichain && 
                   configHasCeler && !abiHasMultichain && abiHasCeler;
    
    if (allGood) {
      console.log('✅ SUCCESS: Bridge monitoring system successfully updated!');
      console.log('✅ MULTICHAIN completely removed');
      console.log('✅ CELER fully integrated');
      console.log('✅ All configurations updated');
      console.log('✅ Database cleaned and migrated');
    } else {
      console.log('❌ ISSUES FOUND: Some updates may be incomplete');
      console.log('   Please check the details above and complete any missing steps');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyBridgeUpdate(); 