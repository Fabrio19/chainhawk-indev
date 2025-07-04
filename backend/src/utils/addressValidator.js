const { ethers } = require('ethers');

/**
 * Validates and fixes Ethereum addresses
 */
class AddressValidator {
  /**
   * Validates if an address is properly formatted
   * @param {string} address - The address to validate
   * @returns {boolean} - True if valid
   */
  static isValidAddress(address) {
    try {
      return ethers.utils.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the checksummed version of an address
   * @param {string} address - The address to checksum
   * @returns {string|null} - Checksummed address or null if invalid
   */
  static getChecksumAddress(address) {
    try {
      if (!address || typeof address !== 'string') {
        return null;
      }
      
      // Trim whitespace
      address = address.trim();
      
      // Check if it's already valid
      if (ethers.utils.isAddress(address)) {
        return ethers.utils.getAddress(address);
      }
      
      // Try to fix common issues
      if (address.length === 44) {
        // Remove extra characters if address is too long
        address = address.substring(0, 42);
      }
      
      if (address.length === 42 && address.startsWith('0x')) {
        // Try to checksum
        return ethers.utils.getAddress(address);
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to checksum address ${address}:`, error.message);
      return null;
    }
  }

  /**
   * Validates and fixes a contract address configuration
   * @param {string} address - The address to validate
   * @param {string} context - Context for error messages
   * @returns {string|null} - Fixed address or null if invalid
   */
  static validateContractAddress(address, context = '') {
    if (!address) {
      console.warn(`⚠️  Empty address provided in ${context}`);
      return null;
    }

    const checksummed = this.getChecksumAddress(address);
    if (!checksummed) {
      console.error(`❌ Invalid address in ${context}: ${address}`);
      return null;
    }

    if (checksummed !== address) {
      console.log(`✅ Fixed address in ${context}: ${address} → ${checksummed}`);
    }

    return checksummed;
  }

  /**
   * Validates and fixes a contract addresses object
   * @param {Object} addresses - Object with chain names as keys and addresses as values
   * @param {string} context - Context for error messages
   * @returns {Object} - Object with fixed addresses
   */
  static validateContractAddresses(addresses, context = '') {
    const fixed = {};
    let hasInvalid = false;

    for (const [chain, address] of Object.entries(addresses)) {
      const fixedAddress = this.validateContractAddress(address, `${context}.${chain}`);
      if (fixedAddress) {
        fixed[chain] = fixedAddress;
      } else {
        hasInvalid = true;
        // Use placeholder for invalid addresses
        fixed[chain] = "0x0000000000000000000000000000000000000000";
      }
    }

    if (hasInvalid) {
      console.warn(`⚠️  Some addresses in ${context} were invalid and replaced with placeholders`);
    }

    return fixed;
  }

  /**
   * Safe wrapper for ethers address operations
   * @param {Function} operation - Function that uses the address
   * @param {string} address - Address to use
   * @param {string} context - Context for error messages
   * @returns {any} - Result of operation or null if failed
   */
  static safeAddressOperation(operation, address, context = '') {
    try {
      const checksummed = this.getChecksumAddress(address);
      if (!checksummed) {
        console.error(`❌ Cannot perform operation on invalid address in ${context}: ${address}`);
        return null;
      }
      return operation(checksummed);
    } catch (error) {
      console.error(`❌ Address operation failed in ${context}:`, error.message);
      return null;
    }
  }
}

module.exports = AddressValidator; 