require('dotenv').config();
const { ethers } = require('ethers');

/**
 * Hop Protocol Bridge Listener
 * Monitors Hop Protocol cross-chain bridge events
 */
class HopListener {
  constructor(chainName, rpcUrl) {
    this.chainName = chainName;
    this.rpcUrl = rpcUrl;
    this.provider = null;
    this.contract = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // Hop Protocol contract addresses by chain
    this.contractAddresses = {
      ethereum: "0x3666f603Cc164936C1b87e207F36BEBa4AC5f18a",
      polygon: "0x25D8039bB044dC227f741f9e381C26Be3DbE2329",
      arbitrum: "0x3d4Cc8A61c7528Fd86C55cfe061a78dCBA48EDd1",
      optimism: "0x3d4Cc8A61c7528Fd86C55cfe061a78dCBA48EDd1",
      xdai: "0x25D8039bB044dC227f741f9e381C26Be3DbE2329"
    };
    
    // Hop Protocol ABI for key events
    this.abi = [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "indexed": false, "internalType": "address", "name": "relayer", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "relayerFee", "type": "uint256" }
        ],
        "name": "TransferSent",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "indexed": false, "internalType": "address", "name": "relayer", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "relayerFee", "type": "uint256" }
        ],
        "name": "TransferFromL1Completed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "indexed": false, "internalType": "address", "name": "relayer", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "relayerFee", "type": "uint256" }
        ],
        "name": "TransferFromL2Completed",
        "type": "event"
      }
    ];
  }

  /**
   * Initialize provider and contract
   */
  async initialize() {
    try {
      console.log(`🔗 Initializing Hop Protocol listener for ${this.chainName}...`);
      
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
      console.error(`❌ Failed to initialize Hop Protocol listener for ${this.chainName}:`, error.message);
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
        protocol: 'HOP_PROTOCOL',
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
        case 'TransferSent':
          bridgeData.destinationAddress = args[0]; // recipient
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.metadata.amountOutMin = ethers.utils.formatEther(args[2]);
          bridgeData.metadata.deadline = args[3].toString();
          bridgeData.metadata.relayer = args[4];
          bridgeData.metadata.relayerFee = ethers.utils.formatEther(args[5]);
          break;
          
        case 'TransferFromL1Completed':
          bridgeData.destinationAddress = args[0]; // recipient
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.sourceChain = 'ethereum'; // L1
          bridgeData.destinationChain = this.chainName;
          bridgeData.metadata.amountOutMin = ethers.utils.formatEther(args[2]);
          bridgeData.metadata.deadline = args[3].toString();
          bridgeData.metadata.relayer = args[4];
          bridgeData.metadata.relayerFee = ethers.utils.formatEther(args[5]);
          break;
          
        case 'TransferFromL2Completed':
          bridgeData.destinationAddress = args[0]; // recipient
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.sourceChain = this.chainName;
          bridgeData.destinationChain = 'ethereum'; // L1
          bridgeData.metadata.amountOutMin = ethers.utils.formatEther(args[2]);
          bridgeData.metadata.deadline = args[3].toString();
          bridgeData.metadata.relayer = args[4];
          bridgeData.metadata.relayerFee = ethers.utils.formatEther(args[5]);
          break;
      }

      // Log the event
      console.log(`📡 Hop Protocol ${eventName} on ${this.chainName}:`);
      console.log(`   TX: ${txHash}`);
      console.log(`   From: ${bridgeData.sourceChain} -> To: ${bridgeData.destinationChain}`);
      console.log(`   Amount: ${bridgeData.amount} tokens`);
      console.log(`   Recipient: ${bridgeData.destinationAddress}`);

      // Export via callback if provided
      if (this.onEventCallback) {
        await this.onEventCallback(bridgeData);
      }

      return bridgeData;
    } catch (error) {
      console.error(`❌ Error handling Hop Protocol ${eventName} event:`, error.message);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    console.log(`🎧 Setting up Hop Protocol event listeners for ${this.chainName}...`);

    // Listen to TransferSent events
    this.contract.on('TransferSent', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TransferSent', args.slice(0, -1), event);
    });

    // Listen to TransferFromL1Completed events
    this.contract.on('TransferFromL1Completed', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TransferFromL1Completed', args.slice(0, -1), event);
    });

    // Listen to TransferFromL2Completed events
    this.contract.on('TransferFromL2Completed', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TransferFromL2Completed', args.slice(0, -1), event);
    });

    console.log(`✅ Hop Protocol event listeners set up for ${this.chainName}`);
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

      console.log(`🚀 Hop Protocol bridge watcher started for ${this.chainName}`);
      
      // Set up error handling and reconnection
      this.provider.on('error', async (error) => {
        console.error(`❌ Hop Protocol provider error on ${this.chainName}:`, error.message);
        await this.handleReconnect();
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to start Hop Protocol monitoring for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for Hop Protocol ${this.chainName}`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect Hop Protocol ${this.chainName} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.stopMonitoring();
        await this.startMonitoring(this.onEventCallback);
        console.log(`✅ Hop Protocol reconnection successful for ${this.chainName}`);
      } catch (error) {
        console.error(`❌ Hop Protocol reconnection failed for ${this.chainName}:`, error.message);
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
      console.log(`🛑 Hop Protocol bridge watcher stopped for ${this.chainName}`);
    } catch (error) {
      console.error(`❌ Error stopping Hop Protocol monitoring for ${this.chainName}:`, error.message);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      protocol: 'HOP_PROTOCOL',
      chain: this.chainName,
      isListening: this.isListening,
      contractAddress: this.contract?.address,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Start Hop Protocol bridge watcher
 * @param {string} chainName - Chain name (ethereum, polygon, arbitrum, etc.)
 * @param {string} rpcUrl - RPC URL for the chain
 * @param {function} onEventCallback - Optional callback for events
 * @returns {HopListener} - Bridge listener instance
 */
async function startBridgeWatcher(chainName, rpcUrl, onEventCallback = null) {
  const listener = new HopListener(chainName, rpcUrl);
  await listener.startMonitoring(onEventCallback);
  return listener;
}

module.exports = {
  HopListener,
  startBridgeWatcher
}; 