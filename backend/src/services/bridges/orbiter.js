require('dotenv').config();
const { ethers } = require('ethers');

/**
 * Orbiter Finance Bridge Listener
 * Monitors Orbiter Finance cross-chain bridge events
 */
class OrbiterListener {
  constructor(chainName, rpcUrl) {
    this.chainName = chainName;
    this.rpcUrl = rpcUrl;
    this.provider = null;
    this.contract = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // Orbiter Finance contract addresses by chain
    this.contractAddresses = {
      ethereum: "0x80C67432656d59144cEFf962E8fAF8926599bCF8",
      arbitrum: "0x80C67432656d59144cEFf962E8fAF8926599bCF8",
      optimism: "0x80C67432656d59144cEFf962E8fAF8926599bCF8",
      zksync: "0x80C67432656d59144cEFf962E8fAF8926599bCF8",
      linea: "0x80C67432656d59144cEFf962E8fAF8926599bCF8",
      base: "0x80C67432656d59144cEFf962E8fAF8926599bCF8",
      polygon: "0x80C67432656d59144cEFf962E8fAF8926599bCF8"
    };
    
    // Orbiter Finance ABI for key events
    this.abi = [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "Transfer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
        ],
        "name": "TransferCompleted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" },
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
      console.log(`🔗 Initializing Orbiter Finance listener for ${this.chainName}...`);
      
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
      console.error(`❌ Failed to initialize Orbiter Finance listener for ${this.chainName}:`, error.message);
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
        protocol: 'ORBITER_FINANCE',
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
        case 'Transfer':
          bridgeData.sourceAddress = args[0]; // from
          bridgeData.destinationAddress = args[1]; // to
          bridgeData.amount = ethers.utils.formatEther(args[2]); // amount
          bridgeData.metadata.fee = ethers.utils.formatEther(args[3]);
          bridgeData.metadata.nonce = args[4].toString();
          break;
          
        case 'TransferCompleted':
          bridgeData.sourceAddress = args[0]; // from
          bridgeData.destinationAddress = args[1]; // to
          bridgeData.amount = ethers.utils.formatEther(args[2]); // amount
          bridgeData.metadata.fee = ethers.utils.formatEther(args[3]);
          bridgeData.metadata.nonce = args[4].toString();
          break;
          
        case 'TransferFailed':
          bridgeData.sourceAddress = args[0]; // from
          bridgeData.destinationAddress = args[1]; // to
          bridgeData.amount = ethers.utils.formatEther(args[2]); // amount
          bridgeData.metadata.fee = ethers.utils.formatEther(args[3]);
          bridgeData.metadata.nonce = args[4].toString();
          break;
      }

      // Log the event
      console.log(`📡 Orbiter Finance ${eventName} on ${this.chainName}:`);
      console.log(`   TX: ${txHash}`);
      console.log(`   From: ${bridgeData.sourceAddress} -> To: ${bridgeData.destinationAddress}`);
      console.log(`   Amount: ${bridgeData.amount} tokens`);
      console.log(`   Fee: ${bridgeData.metadata.fee}`);

      // Export via callback if provided
      if (this.onEventCallback) {
        await this.onEventCallback(bridgeData);
      }

      return bridgeData;
    } catch (error) {
      console.error(`❌ Error handling Orbiter Finance ${eventName} event:`, error.message);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    console.log(`🎧 Setting up Orbiter Finance event listeners for ${this.chainName}...`);

    // Listen to Transfer events
    this.contract.on('Transfer', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Transfer', args.slice(0, -1), event);
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

    console.log(`✅ Orbiter Finance event listeners set up for ${this.chainName}`);
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

      console.log(`🚀 Orbiter Finance bridge watcher started for ${this.chainName}`);
      
      // Set up error handling and reconnection
      this.provider.on('error', async (error) => {
        console.error(`❌ Orbiter Finance provider error on ${this.chainName}:`, error.message);
        await this.handleReconnect();
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to start Orbiter Finance monitoring for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for Orbiter Finance ${this.chainName}`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect Orbiter Finance ${this.chainName} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.stopMonitoring();
        await this.startMonitoring(this.onEventCallback);
        console.log(`✅ Orbiter Finance reconnection successful for ${this.chainName}`);
      } catch (error) {
        console.error(`❌ Orbiter Finance reconnection failed for ${this.chainName}:`, error.message);
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
      console.log(`🛑 Orbiter Finance bridge watcher stopped for ${this.chainName}`);
    } catch (error) {
      console.error(`❌ Error stopping Orbiter Finance monitoring for ${this.chainName}:`, error.message);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      protocol: 'ORBITER_FINANCE',
      chain: this.chainName,
      isListening: this.isListening,
      contractAddress: this.contract?.address,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Start Orbiter Finance bridge watcher
 * @param {string} chainName - Chain name (ethereum, arbitrum, optimism, etc.)
 * @param {string} rpcUrl - RPC URL for the chain
 * @param {function} onEventCallback - Optional callback for events
 * @returns {OrbiterListener} - Bridge listener instance
 */
async function startBridgeWatcher(chainName, rpcUrl, onEventCallback = null) {
  const listener = new OrbiterListener(chainName, rpcUrl);
  await listener.startMonitoring(onEventCallback);
  return listener;
}

module.exports = {
  OrbiterListener,
  startBridgeWatcher
}; 