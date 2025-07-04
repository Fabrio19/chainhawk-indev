const { ethers } = require("ethers");

class EventDecoder {
  constructor() {
    this.chainIdMap = {
      1: 'ethereum',
      56: 'bsc',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      43114: 'avalanche',
      1399811150: 'solana' // Wormhole chain ID for Solana
    };
  }

  /**
   * Decode bridge event and extract relevant data
   */
  async decodeEvent(eventName, args, bridgeName) {
    try {
      switch (bridgeName) {
        case 'STARGATE':
          return this.decodeStargateEvent(eventName, args);
        case 'WORMHOLE':
          return this.decodeWormholeEvent(eventName, args);
        case 'SYNAPSE':
          return this.decodeSynapseEvent(eventName, args);
        case 'CELER':
          return this.decodeCelerEvent(eventName, args);
        default:
          throw new Error(`Unknown bridge: ${bridgeName}`);
      }
    } catch (error) {
      console.error(`❌ Error decoding ${eventName} for ${bridgeName}:`, error.message);
      return this.getDefaultDecodedData(eventName, args);
    }
  }

  /**
   * Decode Stargate events
   */
  decodeStargateEvent(eventName, args) {
    switch (eventName) {
      case 'SendMsg':
        return {
          sourceAddress: this.extractAddress(args[1]), // srcAddress
          destinationChain: this.chainIdMap[args[0]] || `chain-${args[0]}`, // chainId
          tokenAddress: args[3], // token
          amount: args[5].toString(), // amountLD
          nonce: args[2].toString(), // nonce
          messageId: `${args[0]}-${args[2]}`, // chainId-nonce
          tokenSymbol: this.getTokenSymbol(args[3]),
          destinationAddress: null, // Will be filled by destination event
          signature: null,
          payload: args[8] || null
        };

      case 'ReceiveMsg':
        return {
          sourceAddress: this.extractAddress(args[1]), // srcAddress
          destinationChain: this.chainIdMap[args[0]] || `chain-${args[0]}`, // chainId
          tokenAddress: args[3], // token
          amount: args[5].toString(), // amountLD
          nonce: args[2].toString(), // nonce
          messageId: `${args[0]}-${args[2]}`, // chainId-nonce
          tokenSymbol: this.getTokenSymbol(args[3]),
          destinationAddress: this.extractAddress(args[1]), // srcAddress
          signature: null,
          payload: args[8] || null
        };

      case 'Swap':
        return {
          sourceAddress: args[7], // to address
          destinationChain: this.chainIdMap[args[0]] || `chain-${args[0]}`, // chainId
          tokenAddress: null, // Will be determined from pool IDs
          amount: args[3].toString(), // amountLD
          nonce: null,
          messageId: `${eventName}-${args[0]}-${args[3]}`,
          tokenSymbol: 'Unknown',
          destinationAddress: args[7], // to address
          signature: null,
          payload: args[8] || null
        };

      default:
        return this.getDefaultDecodedData(eventName, args);
    }
  }

  /**
   * Decode Wormhole events
   */
  decodeWormholeEvent(eventName, args) {
    switch (eventName) {
      case 'LogMessagePublished':
        return {
          sourceAddress: args[0], // sender
          destinationChain: this.chainIdMap[args[1]] || `chain-${args[1]}`, // target chain
          tokenAddress: null,
          amount: null,
          nonce: args[2].toString(), // sequence
          messageId: args[3], // message ID
          tokenSymbol: 'Unknown',
          destinationAddress: null,
          signature: null,
          payload: args[4] || null
        };

      case 'TransferTokens':
        return {
          sourceAddress: args[3], // recipient
          destinationChain: this.chainIdMap[args[0]] || `chain-${args[0]}`, // target chain
          tokenAddress: args[3], // token contract
          amount: args[2].toString(), // amount
          nonce: args[4].toString(), // sequence
          messageId: args[1], // message ID
          tokenSymbol: this.getTokenSymbol(args[3]),
          destinationAddress: args[3], // recipient
          signature: null,
          payload: null
        };

      case 'TransferTokensWithPayload':
        return {
          sourceAddress: args[3], // recipient
          destinationChain: this.chainIdMap[args[0]] || `chain-${args[0]}`, // target chain
          tokenAddress: args[3], // token contract
          amount: args[2].toString(), // amount
          nonce: args[4].toString(), // sequence
          messageId: args[1], // message ID
          tokenSymbol: this.getTokenSymbol(args[3]),
          destinationAddress: args[3], // recipient
          signature: null,
          payload: args[5] || null
        };

      case 'Redeem':
        return {
          sourceAddress: args[3], // recipient
          destinationChain: this.chainIdMap[args[0]] || `chain-${args[0]}`, // target chain
          tokenAddress: args[3], // token contract
          amount: args[2].toString(), // amount
          nonce: args[4].toString(), // sequence
          messageId: args[1], // message ID
          tokenSymbol: this.getTokenSymbol(args[3]),
          destinationAddress: args[3], // recipient
          signature: null,
          payload: null
        };

      default:
        return this.getDefaultDecodedData(eventName, args);
    }
  }

  /**
   * Decode Synapse events
   */
  decodeSynapseEvent(eventName, args) {
    switch (eventName) {
      case 'TokenSwap':
        return {
          sourceAddress: args[0], // from
          destinationChain: 'unknown', // Will be determined from context
          tokenAddress: args[2], // tokenFrom
          amount: args[1].toString(), // amountFrom
          nonce: null,
          messageId: `${eventName}-${args[0]}-${args[1]}`,
          tokenSymbol: this.getTokenSymbol(args[2]),
          destinationAddress: args[4], // to
          signature: null,
          payload: null
        };

      case 'TokenRedeem':
        return {
          sourceAddress: args[2], // to
          destinationChain: 'unknown', // Will be determined from context
          tokenAddress: args[0], // token
          amount: args[1].toString(), // amount
          nonce: args[3].toString(), // nonce
          messageId: `${eventName}-${args[3]}`,
          tokenSymbol: this.getTokenSymbol(args[0]),
          destinationAddress: args[2], // to
          signature: null,
          payload: null
        };

      default:
        return this.getDefaultDecodedData(eventName, args);
    }
  }

  /**
   * Decode Celer events
   */
  decodeCelerEvent(eventName, args) {
    switch (eventName) {
      case 'Send':
        return {
          sourceAddress: args[0], // sender
          destinationChain: 'unknown', // Will be determined from dstChainId
          tokenAddress: args[1], // token
          amount: args[2].toString(), // amount
          nonce: args[3].toString(), // seqNum
          messageId: `${args[3]}-${args[4]}`, // seqNum-dstChainId
          tokenSymbol: this.getTokenSymbol(args[1]),
          destinationAddress: null,
          signature: null,
          payload: null
        };

      case 'Relay':
        return {
          sourceAddress: args[0], // sender
          destinationChain: 'unknown', // Will be determined from dstChainId
          tokenAddress: args[1], // token
          amount: args[3].toString(), // amount
          nonce: args[4].toString(), // seqNum
          messageId: `${args[4]}-${args[5]}`, // seqNum-dstChainId
          tokenSymbol: this.getTokenSymbol(args[1]),
          destinationAddress: args[2], // receiver
          signature: args[6] || null, // sig
          payload: null
        };

      case 'Receive':
        return {
          sourceAddress: args[0], // sender
          destinationChain: 'unknown', // Will be determined from dstChainId
          tokenAddress: args[1], // token
          amount: args[3].toString(), // amount
          nonce: args[4].toString(), // seqNum
          messageId: `${args[4]}-${args[5]}`, // seqNum-dstChainId
          tokenSymbol: this.getTokenSymbol(args[1]),
          destinationAddress: args[2], // receiver
          signature: args[6] || null, // sig
          payload: null
        };

      default:
        return this.getDefaultDecodedData(eventName, args);
    }
  }

  /**
   * Extract address from bytes or address format
   */
  extractAddress(addressBytes) {
    try {
      if (typeof addressBytes === 'string' && addressBytes.startsWith('0x')) {
        return addressBytes;
      }
      
      // Convert bytes to address
      if (addressBytes && addressBytes.length >= 20) {
        return ethers.getAddress(addressBytes.slice(-20));
      }
      
      return addressBytes;
    } catch (error) {
      return addressBytes;
    }
  }

  /**
   * Get token symbol from address (placeholder - should be enhanced with token registry)
   */
  getTokenSymbol(tokenAddress) {
    if (!tokenAddress) return 'Unknown';
    
    // Common token addresses
    const tokenSymbols = {
      '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C': 'USDC',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'WBTC',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'WETH',
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'DAI',
      '0x514910771AF9Ca656af840dff83E8264EcF986CA': 'LINK',
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': 'UNI',
      '0x7D1AfA7B718fb893dB30A3aBc0Cfc608aCafEBB': 'MATIC',
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 'WMATIC',
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d': 'USDC',
      '0x55d398326f99059fF775485246999027B3197955': 'USDT',
      '0xbb4CdB9CBd36B01bD1cBaEF2aF8C6b1c6c6c6c6c': 'WBNB'
    };

    return tokenSymbols[tokenAddress] || 'Unknown';
  }

  /**
   * Get default decoded data for unknown events
   */
  getDefaultDecodedData(eventName, args) {
    return {
      sourceAddress: args[0] || null,
      destinationChain: 'unknown',
      tokenAddress: null,
      amount: args.length > 1 ? args[1]?.toString() : null,
      nonce: null,
      messageId: `${eventName}-${Date.now()}`,
      tokenSymbol: 'Unknown',
      destinationAddress: null,
      signature: null,
      payload: null
    };
  }

  /**
   * Validate decoded data
   */
  validateDecodedData(data) {
    const required = ['sourceAddress', 'amount', 'messageId'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Missing required fields: ${missing.join(', ')}`);
      return false;
    }
    
    return true;
  }
}

module.exports = EventDecoder; 
 
 