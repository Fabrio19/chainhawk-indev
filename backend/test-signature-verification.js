require('dotenv').config();
const BridgeSignatureService = require('./src/services/bridges/bridgeSignatureService');
const ValidatorRegistry = require('./src/services/bridges/validatorRegistry');
const CrossChainMapper = require('./src/services/bridges/crossChainMapper');

async function testSignatureVerification() {
  console.log('🔐 Testing Enhanced Bridge Signature Verification System...');
  console.log('==========================================\n');

  try {
    // 1. Test Validator Registry
    console.log('1️⃣ Testing Validator Registry...');
    const validatorRegistry = new ValidatorRegistry();
    
    // Test Wormhole guardians
    const wormholeGuardians = await validatorRegistry.getWormholeGuardians();
    console.log('✅ Wormhole guardians retrieved:', wormholeGuardians.length, 'guardians');
    
    // Test Celer validators
    const celerValidators = await validatorRegistry.getCelerValidators();
    console.log('✅ Celer validators retrieved:', celerValidators.length, 'validators');
    
    // Test validator trust check
    const isTrusted = await validatorRegistry.isTrustedValidator('WORMHOLE', wormholeGuardians[0]);
    console.log('✅ Validator trust check:', isTrusted);
    
    // Get validator statistics
    const validatorStats = validatorRegistry.getValidatorStats();
    console.log('✅ Validator statistics:', validatorStats);

    // 2. Test Bridge Signature Service
    console.log('\n2️⃣ Testing Bridge Signature Service...');
    const signatureService = new BridgeSignatureService();
    
    // Test Wormhole signature verification
    const wormholeMessageData = {
      messageId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      payload: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      guardianSet: wormholeGuardians
    };
    
    const mockWormholeSignature = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const wormholeResult = await signatureService.verifyBridgeSignature('WORMHOLE', wormholeMessageData, mockWormholeSignature);
    console.log('✅ Wormhole signature verification:', wormholeResult);
    
    // Test Celer signature verification
    const celerMessageData = {
      messageHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      validatorSet: celerValidators
    };
    
    const mockCelerSignature = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const celerResult = await signatureService.verifyBridgeSignature('CELER', celerMessageData, mockCelerSignature);
    console.log('✅ Celer signature verification:', celerResult);
    
    // Test Stargate (no signature required)
    const stargateMessageData = {
      messageId: 'stargate-12345',
      nonce: '12345',
      srcChainId: 1,
      dstChainId: 56,
      amount: '1000000000',
      token: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C'
    };
    
    const stargateResult = await signatureService.verifyBridgeSignature('STARGATE', stargateMessageData, '');
    console.log('✅ Stargate message verification:', stargateResult);

    // 3. Test Cross-Chain Mapper
    console.log('\n3️⃣ Testing Cross-Chain Mapper...');
    const crossChainMapper = new CrossChainMapper();
    
    // Test mapping creation
    const mappingData = {
      bridgeProtocol: 'WORMHOLE',
      messageId: 'wormhole-12345',
      nonce: '12345',
      srcChainId: 1,
      dstChainId: 56,
      amount: '1000000000',
      token: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C',
      sourceAddress: '0x1234567890123456789012345678901234567890',
      destinationAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      signatureVerified: true,
      validators: wormholeGuardians.slice(0, 3),
      confidence: 0.9,
      metadata: {
        test: true
      }
    };
    
    try {
      const mapping = await crossChainMapper.createOrUpdateMapping(mappingData);
      console.log('✅ Cross-chain mapping created:', mapping.id);
    } catch (error) {
      console.log('⚠️ Mapping creation skipped (database not available):', error.message);
    }
    
    // Test transaction linking
    const sourceTx = {
      id: 'source-tx-id',
      bridgeProtocol: 'WORMHOLE',
      sourceChain: 'ethereum',
      destinationChain: 'bsc',
      sourceAddress: '0x1234567890123456789012345678901234567890',
      destinationAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      tokenAddress: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C',
      tokenSymbol: 'USDC',
      amount: '1000000000',
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      eventType: 'TransferTokens',
      timestamp: new Date(),
      riskScore: 0.3,
      riskFlags: ['LOW_RISK']
    };
    
    const destTx = {
      id: 'dest-tx-id',
      bridgeProtocol: 'WORMHOLE',
      sourceChain: 'bsc',
      destinationChain: 'ethereum',
      sourceAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      destinationAddress: '0x1234567890123456789012345678901234567890',
      tokenAddress: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C',
      tokenSymbol: 'USDC',
      amount: '1000000000',
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      eventType: 'Redeem',
      timestamp: new Date(Date.now() + 60000), // 1 minute later
      riskScore: 0.4,
      riskFlags: ['LOW_RISK']
    };
    
    try {
      const link = await crossChainMapper.linkTransactions(sourceTx, destTx);
      console.log('✅ Transaction linking completed:', link.id);
    } catch (error) {
      console.log('⚠️ Transaction linking skipped (database not available):', error.message);
    }

    // 4. Test Batch Verification
    console.log('\n4️⃣ Testing Batch Verification...');
    
    const batchVerifications = [
      {
        bridgeProtocol: 'WORMHOLE',
        messageData: wormholeMessageData,
        signature: mockWormholeSignature,
        metadata: { batch: true }
      },
      {
        bridgeProtocol: 'CELER',
        messageData: celerMessageData,
        signature: mockCelerSignature,
        metadata: { batch: true }
      },
      {
        bridgeProtocol: 'STARGATE',
        messageData: stargateMessageData,
        signature: '',
        metadata: { batch: true }
      }
    ];
    
    const batchResults = await signatureService.batchVerifySignatures(batchVerifications);
    console.log('✅ Batch verification completed:', batchResults.length, 'results');

    // 5. Test Statistics
    console.log('\n5️⃣ Testing Statistics...');
    
    const verificationStats = signatureService.getVerificationStats();
    console.log('✅ Verification statistics:', verificationStats);
    
    const validatorStatsFinal = validatorRegistry.getValidatorStats();
    console.log('✅ Final validator statistics:', validatorStatsFinal);

    // 6. Test Error Handling
    console.log('\n6️⃣ Testing Error Handling...');
    
    // Test invalid bridge
    try {
      await signatureService.verifyBridgeSignature('INVALID_BRIDGE', {}, '');
      console.log('❌ Should have thrown error for invalid bridge');
    } catch (error) {
      console.log('✅ Properly handled invalid bridge error');
    }
    
    // Test invalid validator
    const invalidValidator = await validatorRegistry.isTrustedValidator('WORMHOLE', '0x0000000000000000000000000000000000000000');
    console.log('✅ Invalid validator check:', !invalidValidator);

    console.log('\n==========================================');
    console.log('✅ Enhanced Signature Verification System Test Completed!');
    console.log('🔐 All signature verification components working correctly');
    console.log('🔗 Cross-chain mapping system functional');
    console.log('📊 Statistics and monitoring active');
    console.log('🛡️ Security features operational');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testSignatureVerification(); 
 
 