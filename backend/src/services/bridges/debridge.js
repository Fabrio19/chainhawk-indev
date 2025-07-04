require('dotenv').config();
const { ethers } = require('ethers');

/**
 * deBridge Bridge Listener
 * Monitors deBridge cross-chain bridge events
 */
class DebridgeListener {
  constructor(chainName, rpcUrl) {
    this.chainName = chainName;
    this.rpcUrl = rpcUrl;
    this.provider = null;
    this.contract = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // deBridge contract addresses by chain
    // Note: Using placeholder addresses - replace with actual deBridge contract addresses
    this.contractAddresses = {
      ethereum: "0x0000000000000000000000000000000000000000", // Placeholder
      bsc: "0x0000000000000000000000000000000000000000", // Placeholder
      polygon: "0x0000000000000000000000000000000000000000", // Placeholder
      arbitrum: "0x0000000000000000000000000000000000000000", // Placeholder
      optimism: "0x0000000000000000000000000000000000000000", // Placeholder
      avalanche: "0x0000000000000000000000000000000000000000", // Placeholder
      fantom: "0x0000000000000000000000000000000000000000" // Placeholder
    };
    
    // deBridge ABI for key events
    this.abi = [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "bytes32", "name": "debridgeId", "type": "bytes32" },
          { "indexed": true, "internalType": "uint256", "name": "chainIdFrom", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "chainIdTo", "type": "uint256" },
          { "indexed": false, "internalType": "address", "name": "receiver", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "Sent",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "bytes32", "name": "debridgeId", "type": "bytes32" },
          { "indexed": true, "internalType": "uint256", "name": "chainIdFrom", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "chainIdTo", "type": "uint256" },
          { "indexed": false, "internalType": "address", "name": "receiver", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "Claimed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "bytes32", "name": "debridgeId", "type": "bytes32" },
          { "indexed": true, "internalType": "uint256", "name": "chainIdFrom", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "chainIdTo", "type": "uint256" },
          { "indexed": false, "internalType": "address", "name": "receiver", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "Failed",
        "type": "event"
      }
    ];
  }

  /**
   * Initialize provider and contract
   */
  async initialize() {
    try {
      console.log(`🔗 Initializing deBridge listener for ${this.chainName}...`);
      
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
      console.error(`❌ Failed to initialize deBridge listener for ${this.chainName}:`, error.message);
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
        protocol: 'DEBRIDGE',
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
        case 'Sent':
          bridgeData.sourceAddress = args[2]; // sender
          bridgeData.destinationChain = this.getChainName(args[3]); // chainIdTo
          bridgeData.destinationAddress = args[4]; // receiver
          bridgeData.amount = ethers.utils.formatEther(args[5]); // amount
          bridgeData.metadata.debridgeId = args[0];
          bridgeData.metadata.chainIdFrom = args[1].toString();
          bridgeData.metadata.nonce = args[6].toString();
          break;
          
        case 'Claimed':
          bridgeData.sourceAddress = args[2]; // sender
          bridgeData.sourceChain = this.getChainName(args[1]); // chainIdFrom
          bridgeData.destinationAddress = args[4]; // receiver
          bridgeData.destinationChain = this.chainName;
          bridgeData.amount = ethers.utils.formatEther(args[5]); // amount
          bridgeData.metadata.debridgeId = args[0];
          bridgeData.metadata.chainIdTo = args[3].toString();
          bridgeData.metadata.nonce = args[6].toString();
          break;
          
        case 'Failed':
          bridgeData.sourceAddress = args[2]; // sender
          bridgeData.sourceChain = this.getChainName(args[1]); // chainIdFrom
          bridgeData.destinationAddress = args[4]; // receiver
          bridgeData.destinationChain = this.getChainName(args[3]); // chainIdTo
          bridgeData.amount = ethers.utils.formatEther(args[5]); // amount
          bridgeData.metadata.debridgeId = args[0];
          bridgeData.metadata.nonce = args[6].toString();
          break;
      }

      // Log the event
      console.log(`📡 deBridge ${eventName} on ${this.chainName}:`);
      console.log(`   TX: ${txHash}`);
      console.log(`   From: ${bridgeData.sourceChain} -> To: ${bridgeData.destinationChain}`);
      console.log(`   Amount: ${bridgeData.amount} tokens`);
      console.log(`   Sender: ${bridgeData.sourceAddress}`);
      console.log(`   Receiver: ${bridgeData.destinationAddress}`);

      // Export via callback if provided
      if (this.onEventCallback) {
        await this.onEventCallback(bridgeData);
      }

      return bridgeData;
    } catch (error) {
      console.error(`❌ Error handling deBridge ${eventName} event:`, error.message);
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

    console.log(`🎧 Setting up deBridge event listeners for ${this.chainName}...`);

    // Listen to Sent events
    this.contract.on('Sent', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Sent', args.slice(0, -1), event);
    });

    // Listen to Claimed events
    this.contract.on('Claimed', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Claimed', args.slice(0, -1), event);
    });

    // Listen to Failed events
    this.contract.on('Failed', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Failed', args.slice(0, -1), event);
    });

    console.log(`✅ deBridge event listeners set up for ${this.chainName}`);
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

      console.log(`🚀 deBridge bridge watcher started for ${this.chainName}`);
      
      // Set up error handling and reconnection
      this.provider.on('error', async (error) => {
        console.error(`❌ deBridge provider error on ${this.chainName}:`, error.message);
        await this.handleReconnect();
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to start deBridge monitoring for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for deBridge ${this.chainName}`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect deBridge ${this.chainName} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.stopMonitoring();
        await this.startMonitoring(this.onEventCallback);
        console.log(`✅ deBridge reconnection successful for ${this.chainName}`);
      } catch (error) {
        console.error(`❌ deBridge reconnection failed for ${this.chainName}:`, error.message);
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
      console.log(`🛑 deBridge bridge watcher stopped for ${this.chainName}`);
    } catch (error) {
      console.error(`❌ Error stopping deBridge monitoring for ${this.chainName}:`, error.message);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      protocol: 'DEBRIDGE',
      chain: this.chainName,
      isListening: this.isListening,
      contractAddress: this.contract?.address,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Start deBridge bridge watcher
 * @param {string} chainName - Chain name (ethereum, bsc, polygon, etc.)
 * @param {string} rpcUrl - RPC URL for the chain
 * @param {function} onEventCallback - Optional callback for events
 * @returns {DebridgeListener} - Bridge listener instance
 */
async function startBridgeWatcher(chainName, rpcUrl, onEventCallback = null) {
  const listener = new DebridgeListener(chainName, rpcUrl);
  await listener.startMonitoring(onEventCallback);
  return listener;
}

module.exports = {
  DebridgeListener,
  startBridgeWatcher
}; 