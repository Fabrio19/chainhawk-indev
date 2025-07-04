require('dotenv').config();
const { ethers } = require('ethers');
const AddressValidator = require('../../utils/addressValidator');

/**
 * xBridge Bridge Listener
 * Monitors xBridge cross-chain bridge events
 */
class XbridgeListener {
  constructor(chainName, rpcUrl) {
    this.chainName = chainName;
    this.rpcUrl = rpcUrl;
    this.provider = null;
    this.contract = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // xBridge contract addresses by chain
    let rawAddresses = {
      ethereum: "0x0000000000000000000000000000000000000000",
      bsc: "0x0000000000000000000000000000000000000000",
      polygon: "0x25D8039bB044dC227f741f9e381C26Be3DbE2329", // Valid Polygon bridge address
      arbitrum: "0x0000000000000000000000000000000000000000",
      optimism: "0x0000000000000000000000000000000000000000",
      avalanche: "0x0000000000000000000000000000000000000000",
      fantom: "0x0000000000000000000000000000000000000000"
    };
    this.contractAddresses = AddressValidator.validateContractAddresses(rawAddresses, 'xbridge');
    
    // xBridge ABI for key events
    this.abi = [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "destinationChainId", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "TransferInitiated",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "sourceChainId", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "TransferCompleted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "sourceChainId", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "TransferFailed",
        "type": "event"
      }
    ];
  }

  /**
   * Initialize provider and contract
   */
  async initialize() {
    try {
      console.log(`🔗 Initializing xBridge listener for ${this.chainName}...`);
      
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
      console.error(`❌ Failed to initialize xBridge listener for ${this.chainName}:`, error.message);
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
        protocol: 'XBRIDGE',
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
        case 'TransferInitiated':
          bridgeData.sourceAddress = args[0]; // sender
          bridgeData.destinationAddress = args[1]; // receiver
          bridgeData.amount = ethers.utils.formatEther(args[2]); // amount
          bridgeData.destinationChain = this.getChainName(args[3]); // destinationChainId
          bridgeData.metadata.nonce = args[4].toString();
          break;
          
        case 'TransferCompleted':
          bridgeData.sourceAddress = args[0]; // sender
          bridgeData.destinationAddress = args[1]; // receiver
          bridgeData.amount = ethers.utils.formatEther(args[2]); // amount
          bridgeData.sourceChain = this.getChainName(args[3]); // sourceChainId
          bridgeData.destinationChain = this.chainName;
          bridgeData.metadata.nonce = args[4].toString();
          break;
          
        case 'TransferFailed':
          bridgeData.sourceAddress = args[0]; // sender
          bridgeData.destinationAddress = args[1]; // receiver
          bridgeData.amount = ethers.utils.formatEther(args[2]); // amount
          bridgeData.sourceChain = this.getChainName(args[3]); // sourceChainId
          bridgeData.destinationChain = this.chainName;
          bridgeData.metadata.nonce = args[4].toString();
          break;
      }

      // Log the event
      console.log(`📡 xBridge ${eventName} on ${this.chainName}:`);
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
      console.error(`❌ Error handling xBridge ${eventName} event:`, error.message);
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

    console.log(`🎧 Setting up xBridge event listeners for ${this.chainName}...`);

    // Listen to TransferInitiated events
    this.contract.on('TransferInitiated', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TransferInitiated', args.slice(0, -1), event);
    });

    // Listen to TransferCompleted events
    this.contract.on('TransferCompleted', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TransferCompleted', args.slice(0, -1), event);
    });

    // Listen to TransferFailed events
    this.contract.on('TransferFailed', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TransferFailed', args.slice(0, -1), event);
    });

    console.log(`✅ xBridge event listeners set up for ${this.chainName}`);
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

      console.log(`🚀 xBridge bridge watcher started for ${this.chainName}`);
      
      // Set up error handling and reconnection
      this.provider.on('error', async (error) => {
        console.error(`❌ xBridge provider error on ${this.chainName}:`, error.message);
        await this.handleReconnect();
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to start xBridge monitoring for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for xBridge ${this.chainName}`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect xBridge ${this.chainName} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.stopMonitoring();
        await this.startMonitoring(this.onEventCallback);
        console.log(`✅ xBridge reconnection successful for ${this.chainName}`);
      } catch (error) {
        console.error(`❌ xBridge reconnection failed for ${this.chainName}:`, error.message);
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
      console.log(`🛑 xBridge bridge watcher stopped for ${this.chainName}`);
    } catch (error) {
      console.error(`❌ Error stopping xBridge monitoring for ${this.chainName}:`, error.message);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      protocol: 'XBRIDGE',
      chain: this.chainName,
      isListening: this.isListening,
      contractAddress: this.contract?.address,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Start xBridge bridge watcher
 * @param {string} chainName - Chain name (ethereum, bsc, polygon, etc.)
 * @param {string} rpcUrl - RPC URL for the chain
 * @param {function} onEventCallback - Optional callback for events
 * @returns {XbridgeListener} - Bridge listener instance
 */
async function startBridgeWatcher(chainName, rpcUrl, onEventCallback = null) {
  const listener = new XbridgeListener(chainName, rpcUrl);
  await listener.startMonitoring(onEventCallback);
  return listener;
}

module.exports = {
  XbridgeListener,
  startBridgeWatcher
}; 