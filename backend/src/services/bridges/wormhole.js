require('dotenv').config();
const { ethers } = require('ethers');
const { saveBridgeTxToPostgres } = require('../pgClient');
const { saveBridgeTxToNeo4j } = require('../neo4jClient');
const AddressValidator = require('../../utils/addressValidator');

/**
 * Wormhole Bridge Listener
 * Monitors Wormhole (Portal) cross-chain bridge events
 */
class WormholeListener {
  constructor(chainName, rpcUrl) {
    this.chainName = chainName;
    this.rpcUrl = rpcUrl;
    this.provider = null;
    this.contract = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // Wormhole contract addresses by chain (real deployed addresses)
    let rawAddresses = {
      ethereum: "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B", // Wormhole Core Bridge
      bsc: "0x98a0F4b96972b32Fcb3BD03cAeB6A0b5B54c2e2F",      // Wormhole BSC Core Bridge
      polygon: "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE",   // Wormhole Polygon Core Bridge
      arbitrum: "0x3cA23C9542cDEc13D1d0F1Bf2d90C93f6F6B06b0", // Wormhole Arbitrum Core Bridge
      optimism: "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B", // Wormhole Optimism Core Bridge (same as ETH)
      avalanche: "0x0C1F4a4eDb3f9b7Bc7dE6Aa60A89EcB0d38F4D70", // Wormhole Avalanche Core Bridge
      fantom: "0x1BB3e1c6D1084eBFe79222a3f46a6F94440c727C"   // Wormhole Fantom Core Bridge
    };
    
    // Validate and fix addresses using ethers.js checksum
    const { getAddress } = require('ethers').utils;
    Object.entries(rawAddresses).forEach(([chain, addr]) => {
      try {
        rawAddresses[chain] = getAddress(addr); // This validates and checksums the address
        console.log(`✅ Validated Wormhole address for ${chain}: ${rawAddresses[chain]}`);
      } catch (err) {
        console.error(`❌ Invalid Wormhole address for ${chain}: ${addr} - ${err.message}`);
        // Replace with placeholder for invalid addresses
        rawAddresses[chain] = "0x0000000000000000000000000000000000000000";
      }
    });
    
    this.contractAddresses = AddressValidator.validateContractAddresses(rawAddresses, 'wormhole');
    
    // Wormhole ABI for key events
    this.abi = [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint16", "name": "emitterChainId", "type": "uint16" },
          { "indexed": true, "internalType": "uint64", "name": "sequence", "type": "uint64" },
          { "indexed": false, "internalType": "uint8", "name": "consistencyLevel", "type": "uint8" },
          { "indexed": false, "internalType": "bytes", "name": "payload", "type": "bytes" }
        ],
        "name": "LogMessagePublished",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": true, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": true, "internalType": "uint16", "name": "recipientChain", "type": "uint16" },
          { "indexed": true, "internalType": "bytes32", "name": "recipient", "type": "bytes32" },
          { "indexed": false, "internalType": "uint256", "name": "arbiterFee", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "TransferTokens",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": true, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": true, "internalType": "uint16", "name": "recipientChain", "type": "uint16" },
          { "indexed": true, "internalType": "bytes32", "name": "recipient", "type": "bytes32" },
          { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "TransferTokensWithPayload",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": true, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": true, "internalType": "uint16", "name": "recipientChain", "type": "uint16" },
          { "indexed": true, "internalType": "bytes32", "name": "recipient", "type": "bytes32" },
          { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "Redeem",
        "type": "event"
      }
    ];
  }

  /**
   * Initialize provider and contract
   */
  async initialize() {
    try {
      console.log(`🔗 Initializing Wormhole listener for ${this.chainName}...`);
      
      this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
      
      // Test connection
      const network = await this.provider.getNetwork();
      console.log(`✅ Connected to ${this.chainName} (Chain ID: ${network.chainId})`);
      
      const contractAddress = this.contractAddresses[this.chainName];
      if (!contractAddress) {
        throw new Error(`No contract address configured for ${this.chainName}`);
      }
      
      this.contract = new ethers.Contract(contractAddress, this.abi, this.provider);
      console.log(`📋 Contract initialized: ${contractAddress}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to initialize Wormhole listener for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle bridge events
   */
  async handleEvent(eventName, args, event) {
    try {
      const txHash = event.transactionHash;
      const blockNumber = event.blockNumber;
      
      let bridgeData = {
        protocol: 'WORMHOLE',
        sourceChain: this.chainName,
        destinationChain: null,
        sourceAddress: null,
        destinationAddress: null,
        tokenAddress: null,
        amount: null,
        txHash: txHash,
        blockNumber: blockNumber,
        eventType: eventName,
        timestamp: new Date().toISOString(),
        metadata: {
          contractAddress: this.contract.address,
          network: this.chainName
        }
      };

      // Extract data based on event type
      switch (eventName) {
        case 'LogMessagePublished':
          bridgeData.sourceChain = this.chainName;
          bridgeData.metadata.emitterChainId = args[0].toString();
          bridgeData.metadata.sequence = args[1].toString();
          bridgeData.metadata.consistencyLevel = args[2].toString();
          bridgeData.metadata.payload = args[3];
          break;
          
        case 'TransferTokens':
          bridgeData.tokenAddress = args[0]; // token
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.destinationChain = this.getChainName(args[2]); // recipientChain
          bridgeData.destinationAddress = this.decodeRecipient(args[3]); // recipient
          bridgeData.metadata.arbiterFee = ethers.utils.formatEther(args[4]);
          bridgeData.metadata.nonce = args[5].toString();
          break;
          
        case 'TransferTokensWithPayload':
          bridgeData.tokenAddress = args[0]; // token
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.destinationChain = this.getChainName(args[2]); // recipientChain
          bridgeData.destinationAddress = this.decodeRecipient(args[3]); // recipient
          bridgeData.metadata.fee = ethers.utils.formatEther(args[4]);
          bridgeData.metadata.nonce = args[5].toString();
          break;
          
        case 'Redeem':
          bridgeData.tokenAddress = args[0]; // token
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.sourceChain = this.getChainName(args[2]); // recipientChain
          bridgeData.destinationAddress = this.decodeRecipient(args[3]); // recipient
          bridgeData.destinationChain = this.chainName;
          bridgeData.metadata.fee = ethers.utils.formatEther(args[4]);
          bridgeData.metadata.nonce = args[5].toString();
          break;
      }

      // Log the event
      console.log(`📡 Wormhole ${eventName} on ${this.chainName}:`);
      console.log(`   TX: ${txHash}`);
      console.log(`   From: ${bridgeData.sourceChain} -> To: ${bridgeData.destinationChain}`);
      console.log(`   Amount: ${bridgeData.amount} tokens`);
      console.log(`   Token: ${bridgeData.tokenAddress}`);

      // Export via callback if provided
      if (this.onEventCallback) {
        await this.onEventCallback(bridgeData);
      }

      await handleDecodedBridgeTx(bridgeData);

      return bridgeData;
    } catch (error) {
      console.error(`❌ Error handling Wormhole ${eventName} event:`, error.message);
    }
  }

  /**
   * Decode recipient address from bytes32
   */
  decodeRecipient(recipientBytes) {
    try {
      if (recipientBytes && recipientBytes.length >= 42) {
        return '0x' + recipientBytes.slice(2, 42);
      }
      return '0x0000000000000000000000000000000000000000';
    } catch (error) {
      return '0x0000000000000000000000000000000000000000';
    }
  }

  /**
   * Map chain ID to chain name
   */
  getChainName(chainId) {
    const chainMap = {
      1: 'ethereum',
      56: 'bsc',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      43114: 'avalanche',
      250: 'fantom',
      324: 'zksync',
      59144: 'linea',
      8453: 'base'
    };
    return chainMap[chainId] || `chain-${chainId}`;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    console.log(`🎧 Setting up Wormhole event listeners for ${this.chainName}...`);

    // Listen to LogMessagePublished events
    this.contract.on('LogMessagePublished', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('LogMessagePublished', args.slice(0, -1), event);
    });

    // Listen to TransferTokens events
    this.contract.on('TransferTokens', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TransferTokens', args.slice(0, -1), event);
    });

    // Listen to TransferTokensWithPayload events
    this.contract.on('TransferTokensWithPayload', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TransferTokensWithPayload', args.slice(0, -1), event);
    });

    // Listen to Redeem events
    this.contract.on('Redeem', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Redeem', args.slice(0, -1), event);
    });

    console.log(`✅ Wormhole event listeners set up for ${this.chainName}`);
  }

  /**
   * Start monitoring with reconnect logic
   */
  async startMonitoring(onEventCallback = null) {
    try {
      this.onEventCallback = onEventCallback;
      
      if (!await this.initialize()) {
        throw new Error('Failed to initialize');
      }

      this.setupEventListeners();
      this.isListening = true;
      this.reconnectAttempts = 0;

      console.log(`🚀 Wormhole bridge watcher started for ${this.chainName}`);
      
      // Set up error handling and reconnection
      this.provider.on('error', async (error) => {
        console.error(`❌ Wormhole provider error on ${this.chainName}:`, error.message);
        await this.handleReconnect();
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to start Wormhole monitoring for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for Wormhole ${this.chainName}`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect Wormhole ${this.chainName} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.stopMonitoring();
        await this.startMonitoring(this.onEventCallback);
        console.log(`✅ Wormhole reconnection successful for ${this.chainName}`);
      } catch (error) {
        console.error(`❌ Wormhole reconnection failed for ${this.chainName}:`, error.message);
        await this.handleReconnect();
      }
    }, this.reconnectDelay);
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    try {
      if (this.contract) {
        this.contract.removeAllListeners();
      }
      
      this.isListening = false;
      console.log(`🛑 Wormhole bridge watcher stopped for ${this.chainName}`);
    } catch (error) {
      console.error(`❌ Error stopping Wormhole monitoring for ${this.chainName}:`, error.message);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      protocol: 'WORMHOLE',
      chain: this.chainName,
      isListening: this.isListening,
      contractAddress: this.contract?.address,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Start Wormhole bridge watcher
 * @param {string} chainName - Chain name (ethereum, bsc, polygon, etc.)
 * @param {string} rpcUrl - RPC URL for the chain
 * @param {function} onEventCallback - Optional callback for events
 * @returns {WormholeListener} - Bridge listener instance
 */
async function startBridgeWatcher(chainName, rpcUrl, onEventCallback = null) {
  const listener = new WormholeListener(chainName, rpcUrl);
  await listener.startMonitoring(onEventCallback);
  return listener;
}

async function handleDecodedBridgeTx(bridgeData) {
  try {
    // Transform bridgeData to the expected format for database storage
    const decodedTx = {
      tx_hash: bridgeData.txHash,
      from_chain: bridgeData.sourceChain,
      to_chain: bridgeData.destinationChain,
      sender: bridgeData.sourceAddress || '0x0000000000000000000000000000000000000000',
      receiver: bridgeData.destinationAddress || '0x0000000000000000000000000000000000000000',
      token: bridgeData.tokenAddress || 'UNKNOWN',
      amount: bridgeData.amount || '0',
      bridge: 'wormhole',
      timestamp: bridgeData.timestamp,
      block_number: bridgeData.blockNumber,
      metadata: JSON.stringify(bridgeData.metadata || {})
    };

    await saveBridgeTxToPostgres(decodedTx);
    await saveBridgeTxToNeo4j(decodedTx);
    console.log(`[Bridge][Wormhole] Saved tx ${decodedTx.tx_hash} to Postgres & Neo4j`);
  } catch (err) {
    console.error(`[Bridge][Wormhole] Error saving tx ${bridgeData.txHash}:`, err.message);
  }
}

module.exports = {
  WormholeListener,
  startBridgeWatcher
}; 