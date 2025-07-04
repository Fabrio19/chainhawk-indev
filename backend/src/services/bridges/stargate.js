require('dotenv').config();
const { ethers } = require('ethers');
const { saveBridgeTxToPostgres } = require('../pgClient');
const { saveBridgeTxToNeo4j } = require('../neo4jClient');

/**
 * Stargate Bridge Listener
 * Monitors Stargate (LayerZero) cross-chain bridge events
 */
class StargateBridgeListener {
  constructor(chainName, rpcUrl) {
    this.chainName = chainName;
    this.rpcUrl = rpcUrl;
    this.provider = null;
    this.contract = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // Stargate contract addresses by chain
    this.contractAddresses = {
      ethereum: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
      bsc: "0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8",
      polygon: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
      arbitrum: "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614",
      optimism: "0xB0D502E938ed5f4df2e681fE6E419ff29631d62b",
      avalanche: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
      fantom: "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6"
    };
    
    // Stargate ABI for key events
    this.abi = [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint16", "name": "chainId", "type": "uint16" },
          { "indexed": false, "internalType": "bytes", "name": "srcAddress", "type": "bytes" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" },
          { "indexed": false, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amountSD", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "amountLD", "type": "uint256" }
        ],
        "name": "SendMsg",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint16", "name": "chainId", "type": "uint16" },
          { "indexed": false, "internalType": "bytes", "name": "srcAddress", "type": "bytes" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" },
          { "indexed": false, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amountSD", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "amountLD", "type": "uint256" }
        ],
        "name": "ReceiveMsg",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint16", "name": "chainId", "type": "uint16" },
          { "indexed": false, "internalType": "uint256", "name": "dstPoolId", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "srcPoolId", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "amountLD", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "amountSD", "type": "uint256" },
          { "indexed": false, "internalType": "address", "name": "to", "type": "address" },
          { "indexed": false, "internalType": "bytes", "name": "payload", "type": "bytes" }
        ],
        "name": "Swap",
        "type": "event"
      }
    ];
  }

  /**
   * Initialize provider and contract
   */
  async initialize() {
    try {
      console.log(`🔗 Initializing Stargate listener for ${this.chainName}...`);
      
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
      console.error(`❌ Failed to initialize Stargate listener for ${this.chainName}:`, error.message);
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
        protocol: 'STARGATE',
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
        case 'SendMsg':
          bridgeData.destinationChain = this.getChainName(args[0]); // chainId
          bridgeData.sourceAddress = this.decodeAddress(args[1]); // srcAddress
          bridgeData.tokenAddress = args[3]; // token
          bridgeData.amount = ethers.utils.formatEther(args[5]); // amountLD
          bridgeData.metadata.nonce = args[2].toString();
          bridgeData.metadata.amountSD = ethers.utils.formatEther(args[4]);
          break;
          
        case 'ReceiveMsg':
          bridgeData.sourceChain = this.getChainName(args[0]); // chainId
          bridgeData.sourceAddress = this.decodeAddress(args[1]); // srcAddress
          bridgeData.destinationChain = this.chainName;
          bridgeData.tokenAddress = args[3]; // token
          bridgeData.amount = ethers.utils.formatEther(args[5]); // amountLD
          bridgeData.metadata.nonce = args[2].toString();
          bridgeData.metadata.amountSD = ethers.utils.formatEther(args[4]);
          break;
          
        case 'Swap':
          bridgeData.destinationChain = this.getChainName(args[0]); // chainId
          bridgeData.amount = ethers.utils.formatEther(args[3]); // amountLD
          bridgeData.destinationAddress = args[5]; // to
          bridgeData.metadata.dstPoolId = args[1].toString();
          bridgeData.metadata.srcPoolId = args[2].toString();
          bridgeData.metadata.amountSD = ethers.utils.formatEther(args[4]);
          break;
      }

      // Log the event
      console.log(`📡 Stargate ${eventName} on ${this.chainName}:`);
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
      console.error(`❌ Error handling Stargate ${eventName} event:`, error.message);
    }
  }

  /**
   * Decode address from bytes
   */
  decodeAddress(addressBytes) {
    try {
      if (addressBytes.length >= 42) {
        return '0x' + addressBytes.slice(2, 42);
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

    console.log(`🎧 Setting up Stargate event listeners for ${this.chainName}...`);

    // Listen to SendMsg events (outgoing transfers)
    this.contract.on('SendMsg', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('SendMsg', args.slice(0, -1), event);
    });

    // Listen to ReceiveMsg events (incoming transfers)
    this.contract.on('ReceiveMsg', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('ReceiveMsg', args.slice(0, -1), event);
    });

    // Listen to Swap events
    this.contract.on('Swap', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Swap', args.slice(0, -1), event);
    });

    console.log(`✅ Stargate event listeners set up for ${this.chainName}`);
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

      console.log(`🚀 Stargate bridge watcher started for ${this.chainName}`);
      
      // Set up error handling and reconnection
      this.provider.on('error', async (error) => {
        console.error(`❌ Stargate provider error on ${this.chainName}:`, error.message);
        await this.handleReconnect();
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to start Stargate monitoring for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for Stargate ${this.chainName}`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect Stargate ${this.chainName} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.stopMonitoring();
        await this.startMonitoring(this.onEventCallback);
        console.log(`✅ Stargate reconnection successful for ${this.chainName}`);
      } catch (error) {
        console.error(`❌ Stargate reconnection failed for ${this.chainName}:`, error.message);
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
      console.log(`🛑 Stargate bridge watcher stopped for ${this.chainName}`);
    } catch (error) {
      console.error(`❌ Error stopping Stargate monitoring for ${this.chainName}:`, error.message);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      protocol: 'STARGATE',
      chain: this.chainName,
      isListening: this.isListening,
      contractAddress: this.contract?.address,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Start Stargate bridge watcher
 * @param {string} chainName - Chain name (ethereum, bsc, polygon, etc.)
 * @param {string} rpcUrl - RPC URL for the chain
 * @param {function} onEventCallback - Optional callback for events
 * @returns {StargateBridgeListener} - Bridge listener instance
 */
async function startBridgeWatcher(chainName, rpcUrl, onEventCallback = null) {
  const listener = new StargateBridgeListener(chainName, rpcUrl);
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
      bridge: 'stargate',
      timestamp: bridgeData.timestamp,
      block_number: bridgeData.blockNumber,
      metadata: JSON.stringify(bridgeData.metadata || {})
    };

    await saveBridgeTxToPostgres(decodedTx);
    await saveBridgeTxToNeo4j(decodedTx);
    console.log(`[Bridge][Stargate] Saved tx ${decodedTx.tx_hash} to Postgres & Neo4j`);
  } catch (err) {
    console.error(`[Bridge][Stargate] Error saving tx ${bridgeData.txHash}:`, err.message);
  }
}

module.exports = {
  StargateBridgeListener,
  startBridgeWatcher
}; 