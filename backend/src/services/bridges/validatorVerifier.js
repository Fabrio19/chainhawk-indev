const { ethers } = require("ethers");
const crypto = require("crypto");

class ValidatorVerifier {
  constructor() {
    this.validatorSets = new Map();
    this.signatureCache = new Map();
    this.initializeValidatorSets();
  }

  /**
   * Initialize validator sets for different bridges
   */
  initializeValidatorSets() {
    // Wormhole validator set (simplified - should be fetched from Wormhole API)
    this.validatorSets.set('WORMHOLE', {
      guardianSet: [
        '0x58CC3AE5C097b213cE3c81979e1B9f9570746AA5',
        '0xfF6CB952589BDE862c25Ef439ab2CB9C08b3Dd8E',
        '0x114De8460193bdf3A2fCf81f86a09765F4762fD1',
        '0x107A0086b32d7A0977926A205131d8731D39cbEB',
        '0x8C82B2fd82FaeD2711d59AF0F2499D16e726f6b2',
        '0x11b39756C042441BE6D8650b69b54EbE715E2343',
        '0x54Ce5B4D348fb74B958e8966e2ec3dBd4958a7cd',
        '0x15e7cAF07C4e3DC8e7C469f92C8Cd88FB8005a20',
        '0x74a3bf913953D695260D88BC1aA26A4fDE4a111b',
        '0x000aC0076727b35FBea2dAc28fEE5cCB0fEA768e',
        '0xAF45Ced136b9D9e24903464AE889F5C8a723FC14',
        '0xf93124b7c738843CBB89E864c862c38cddCccF95',
        '0xD2CC37A4dc036a8D232b48ec2Ec3e6F66617651a',
        '0xDA798F6896A3331F64b48c12D1D57Fd9cbe70811',
        '0x71AA1BE1D36CaFE3867910F99C09e347899C19C3',
        '0x8192b6E7387CCd768277c17DAb1b7a5027c0b3Cf',
        '0x178e21ad2E77AE06711549CFBB1f9c7a9d8096e8',
        '0x5E1487F35515d02A92753504a8D75471b9f49EdB',
        '0x6FbEBc898F403E4773E95feB15E80C9A99c8348d'
      ],
      threshold: 13 // Need 13 out of 19 signatures
    });

    // Celer validator set (simplified)
    this.validatorSets.set('CELER', {
      validatorSet: [
        '0x8C82B2fd82FaeD2711d59AF0F2499D16e726f6b2',
        '0x11b39756C042441BE6D8650b69b54EbE715E2343',
        '0x54Ce5B4D348fb74B958e8966e2ec3dBd4958a7cd'
      ],
      threshold: 2 // Need 2 out of 3 signatures
    });
  }

  /**
   * Verify signature for a bridge message
   */
  async verifySignature(bridgeName, messageId, signature) {
    try {
      // Check cache first
      const cacheKey = `${bridgeName}_${messageId}_${signature}`;
      if (this.signatureCache.has(cacheKey)) {
        return this.signatureCache.get(cacheKey);
      }

      let isValid = false;

      switch (bridgeName) {
        case 'WORMHOLE':
          isValid = await this.verifyWormholeSignature(messageId, signature);
          break;
        case 'CELER':
          isValid = await this.verifyCelerSignature(messageId, signature);
          break;
        default:
          console.log(`⚠️ No signature verification for bridge: ${bridgeName}`);
          isValid = true; // Assume valid if no verification method
      }

      // Cache result
      this.signatureCache.set(cacheKey, isValid);
      
      // Clean cache periodically
      if (this.signatureCache.size > 1000) {
        this.cleanSignatureCache();
      }

      return isValid;
    } catch (error) {
      console.error(`❌ Error verifying signature for ${bridgeName}:`, error.message);
      return false;
    }
  }

  /**
   * Verify Wormhole guardian signatures
   */
  async verifyWormholeSignature(messageId, signature) {
    try {
      const validatorSet = this.validatorSets.get('WORMHOLE');
      if (!validatorSet) {
        console.error('❌ Wormhole validator set not found');
        return false;
      }

      // Parse the signature (Wormhole uses a specific format)
      const signatures = this.parseWormholeSignatures(signature);
      
      let validSignatures = 0;
      const requiredThreshold = validatorSet.threshold;

      for (const sig of signatures) {
        if (sig.index >= 0 && sig.index < validatorSet.guardianSet.length) {
          const guardianAddress = validatorSet.guardianSet[sig.index];
          
          // Verify the signature
          if (await this.verifyEthereumSignature(messageId, sig.signature, guardianAddress)) {
            validSignatures++;
          }
        }
      }

      const isValid = validSignatures >= requiredThreshold;
      
      if (!isValid) {
        console.log(`⚠️ Wormhole signature verification failed: ${validSignatures}/${requiredThreshold} valid signatures`);
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error verifying Wormhole signature:', error.message);
      return false;
    }
  }

  /**
   * Verify Celer validator signatures
   */
  async verifyCelerSignature(messageId, signature) {
    try {
      const validatorSet = this.validatorSets.get('CELER');
      if (!validatorSet) {
        console.error('❌ Celer validator set not found');
        return false;
      }

      // Parse Celer signatures
      const signatures = this.parseCelerSignatures(signature);
      
      let validSignatures = 0;
      const requiredThreshold = validatorSet.threshold;

      for (const sig of signatures) {
        if (validatorSet.validatorSet.includes(sig.validator)) {
          // Verify the signature
          if (await this.verifyEthereumSignature(messageId, sig.signature, sig.validator)) {
            validSignatures++;
          }
        }
      }

      const isValid = validSignatures >= requiredThreshold;
      
      if (!isValid) {
        console.log(`⚠️ Celer signature verification failed: ${validSignatures}/${requiredThreshold} valid signatures`);
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error verifying Celer signature:', error.message);
      return false;
    }
  }

  /**
   * Parse Wormhole guardian signatures
   */
  parseWormholeSignatures(signatureData) {
    try {
      // Wormhole signature format: guardian index + signature
      const signatures = [];
      const signatureBytes = ethers.getBytes(signatureData);
      
      // Each signature is 65 bytes + 1 byte for guardian index
      const signatureLength = 66;
      const numSignatures = Math.floor(signatureBytes.length / signatureLength);
      
      for (let i = 0; i < numSignatures; i++) {
        const start = i * signatureLength;
        const guardianIndex = signatureBytes[start];
        const signature = signatureBytes.slice(start + 1, start + signatureLength);
        
        signatures.push({
          index: guardianIndex,
          signature: ethers.hexlify(signature)
        });
      }
      
      return signatures;
    } catch (error) {
      console.error('❌ Error parsing Wormhole signatures:', error.message);
      return [];
    }
  }

  /**
   * Parse Celer validator signatures
   */
  parseCelerSignatures(signatureData) {
    try {
      // Celer signature format: validator address + signature
      const signatures = [];
      const signatureBytes = ethers.getBytes(signatureData);
      
      // Each signature is 65 bytes + 20 bytes for validator address
      const signatureLength = 85;
      const numSignatures = Math.floor(signatureBytes.length / signatureLength);
      
      for (let i = 0; i < numSignatures; i++) {
        const start = i * signatureLength;
        const validatorAddress = ethers.getAddress(signatureBytes.slice(start, start + 20));
        const signature = signatureBytes.slice(start + 20, start + signatureLength);
        
        signatures.push({
          validator: validatorAddress,
          signature: ethers.hexlify(signature)
        });
      }
      
      return signatures;
    } catch (error) {
      console.error('❌ Error parsing Celer signatures:', error.message);
      return [];
    }
  }

  /**
   * Verify Ethereum signature
   */
  async verifyEthereumSignature(message, signature, expectedSigner) {
    try {
      // Create message hash
      const messageHash = ethers.hashMessage(message);
      
      // Recover signer from signature
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);
      
      return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    } catch (error) {
      console.error('❌ Error verifying Ethereum signature:', error.message);
      return false;
    }
  }

  /**
   * Verify message hash for Wormhole
   */
  async verifyWormholeMessageHash(messageId, payload) {
    try {
      // Wormhole message format: version + timestamp + nonce + emitter + sequence + consistency + payload
      const messageHash = this.createWormholeMessageHash(payload);
      return messageHash === messageId;
    } catch (error) {
      console.error('❌ Error verifying Wormhole message hash:', error.message);
      return false;
    }
  }

  /**
   * Create Wormhole message hash
   */
  createWormholeMessageHash(payload) {
    try {
      // Simplified Wormhole message hash creation
      // In practice, this would follow the exact Wormhole specification
      const messageBytes = ethers.getBytes(payload);
      return ethers.keccak256(messageBytes);
    } catch (error) {
      console.error('❌ Error creating Wormhole message hash:', error.message);
      return null;
    }
  }

  /**
   * Clean signature cache
   */
  cleanSignatureCache() {
    try {
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour
      
      for (const [key, timestamp] of this.signatureCache.entries()) {
        if (now - timestamp > maxAge) {
          this.signatureCache.delete(key);
        }
      }
      
      console.log(`🧹 Cleaned signature cache, ${this.signatureCache.size} entries remaining`);
    } catch (error) {
      console.error('❌ Error cleaning signature cache:', error.message);
    }
  }

  /**
   * Update validator sets (should be called periodically)
   */
  async updateValidatorSets() {
    try {
      console.log('🔄 Updating validator sets...');
      
      // In a real implementation, this would fetch from bridge APIs
      // For now, we'll just log that it should be updated
      console.log('⚠️ Validator sets should be updated from bridge APIs');
      
    } catch (error) {
      console.error('❌ Error updating validator sets:', error.message);
    }
  }

  /**
   * Get validator set for a bridge
   */
  getValidatorSet(bridgeName) {
    return this.validatorSets.get(bridgeName);
  }

  /**
   * Check if bridge requires signature verification
   */
  requiresSignatureVerification(bridgeName) {
    return ['WORMHOLE', 'CELER'].includes(bridgeName);
  }

  /**
   * Get signature verification statistics
   */
  getVerificationStats() {
    const stats = {
      totalVerifications: this.signatureCache.size,
      validSignatures: 0,
      invalidSignatures: 0
    };

    for (const [key, isValid] of this.signatureCache.entries()) {
      if (isValid) {
        stats.validSignatures++;
      } else {
        stats.invalidSignatures++;
      }
    }

    return stats;
  }
}

module.exports = ValidatorVerifier; 
 
 