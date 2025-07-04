require('dotenv').config();
const { ethers } = require('ethers');

/**
 * Across Protocol Bridge Listener
 * Monitors Across Protocol cross-chain bridge events
 */
class AcrossListener {
  constructor(chainName, rpcUrl) {
    this.chainName = chainName;
    this.rpcUrl = rpcUrl;
    this.provider = null;
    this.contract = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // Across Protocol contract addresses by chain
    this.contractAddresses = {
      ethereum: "0x4D9079Bb4165aeb4084c526a32695dCfd2F77381",
      polygon: "0x69B5c72837769eF1e7C164Abc6515DcFf217F920",
      arbitrum: "0x69B5c72837769eF1e7C164Abc6515DcFf217F920",
      optimism: "0x69B5c72837769eF1e7C164Abc6515DcFf217F920",
      boba: "0x69B5c72837769eF1e7C164Abc6515DcFf217F920"
    };
    
    // Across Protocol ABI for key events
    this.abi = [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "relayerFeePct", "type": "uint256" },
          { "indexed": false, "internalType": "uint32", "name": "destinationChainId", "type": "uint32" },
          { "indexed": false, "internalType": "uint64", "name": "depositId", "type": "uint64" },
          { "indexed": false, "internalType": "uint64", "name": "quoteTimestamp", "type": "uint64" }
        ],
        "name": "Deposit",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint64", "name": "depositId", "type": "uint64" },
          { "indexed": false, "internalType": "uint32", "name": "originChainId", "type": "uint32" }
        ],
        "name": "FilledRelay",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint64", "name": "depositId", "type": "uint64" },
          { "indexed": false, "internalType": "uint32", "name": "originChainId", "type": "uint32" }
        ],
        "name": "Relayed",
        "type": "event"
      }
    ];
  }

  /**
   * Initialize provider and contract
   */
  async initialize() {
    try {
      console.log(`🔗 Initializing Across Protocol listener for ${this.chainName}...`);
      
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
      console.error(`❌ Failed to initialize Across Protocol listener for ${this.chainName}:`, error.message);
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
        protocol: 'ACROSS_PROTOCOL',
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
        case 'Deposit':
          bridgeData.destinationAddress = args[0]; // recipient
          bridgeData.tokenAddress = args[1]; // token
          bridgeData.amount = ethers.utils.formatEther(args[2]); // amount
          bridgeData.destinationChain = this.getChainName(args[4]); // destinationChainId
          bridgeData.metadata.relayerFeePct = args[3].toString();
          bridgeData.metadata.depositId = args[5].toString();
          bridgeData.metadata.quoteTimestamp = args[6].toString();
          break;
          
        case 'FilledRelay':
          bridgeData.destinationAddress = args[0]; // recipient
          bridgeData.tokenAddress = args[1]; // token
          bridgeData.amount = ethers.utils.formatEther(args[2]); // amount
          bridgeData.sourceChain = this.getChainName(args[4]); // originChainId
          bridgeData.destinationChain = this.chainName;
          bridgeData.metadata.depositId = args[3].toString();
          break;
          
        case 'Relayed':
          bridgeData.destinationAddress = args[0]; // recipient
          bridgeData.tokenAddress = args[1]; // token
          bridgeData.amount = ethers.utils.formatEther(args[2]); // amount
          bridgeData.sourceChain = this.getChainName(args[4]); // originChainId
          bridgeData.destinationChain = this.chainName;
          bridgeData.metadata.depositId = args[3].toString();
          break;
      }

      // Log the event
      console.log(`📡 Across Protocol ${eventName} on ${this.chainName}:`);
      console.log(`   TX: ${txHash}`);
      console.log(`   From: ${bridgeData.sourceChain} -> To: ${bridgeData.destinationChain}`);
      console.log(`   Amount: ${bridgeData.amount} tokens`);
      console.log(`   Token: ${bridgeData.tokenAddress}`);
      console.log(`   Recipient: ${bridgeData.destinationAddress}`);

      // Export via callback if provided
      if (this.onEventCallback) {
        await this.onEventCallback(bridgeData);
      }

      return bridgeData;
    } catch (error) {
      console.error(`❌ Error handling Across Protocol ${eventName} event:`, error.message);
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
      8453: 'base',
      288: 'boba'
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

    console.log(`🎧 Setting up Across Protocol event listeners for ${this.chainName}...`);

    // Listen to Deposit events
    this.contract.on('Deposit', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Deposit', args.slice(0, -1), event);
    });

    // Listen to FilledRelay events
    this.contract.on('FilledRelay', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('FilledRelay', args.slice(0, -1), event);
    });

    // Listen to Relayed events
    this.contract.on('Relayed', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Relayed', args.slice(0, -1), event);
    });

    console.log(`✅ Across Protocol event listeners set up for ${this.chainName}`);
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

      console.log(`🚀 Across Protocol bridge watcher started for ${this.chainName}`);
      
      // Set up error handling and reconnection
      this.provider.on('error', async (error) => {
        console.error(`❌ Across Protocol provider error on ${this.chainName}:`, error.message);
        await this.handleReconnect();
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to start Across Protocol monitoring for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for Across Protocol ${this.chainName}`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect Across Protocol ${this.chainName} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.stopMonitoring();
        await this.startMonitoring(this.onEventCallback);
        console.log(`✅ Across Protocol reconnection successful for ${this.chainName}`);
      } catch (error) {
        console.error(`❌ Across Protocol reconnection failed for ${this.chainName}:`, error.message);
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
      console.log(`🛑 Across Protocol bridge watcher stopped for ${this.chainName}`);
    } catch (error) {
      console.error(`❌ Error stopping Across Protocol monitoring for ${this.chainName}:`, error.message);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      protocol: 'ACROSS_PROTOCOL',
      chain: this.chainName,
      isListening: this.isListening,
      contractAddress: this.contract?.address,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Start Across Protocol bridge watcher
 * @param {string} chainName - Chain name (ethereum, polygon, arbitrum, etc.)
 * @param {string} rpcUrl - RPC URL for the chain
 * @param {function} onEventCallback - Optional callback for events
 * @returns {AcrossListener} - Bridge listener instance
 */
async function startBridgeWatcher(chainName, rpcUrl, onEventCallback = null) {
  const listener = new AcrossListener(chainName, rpcUrl);
  await listener.startMonitoring(onEventCallback);
  return listener;
}

module.exports = {
  AcrossListener,
  startBridgeWatcher
}; 