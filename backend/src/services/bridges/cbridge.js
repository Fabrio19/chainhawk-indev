require('dotenv').config();
const { ethers } = require('ethers');

/**
 * Celer cBridge Listener
 * Monitors Celer cBridge cross-chain bridge events
 */
class CbridgeListener {
  constructor(chainName, rpcUrl) {
    this.chainName = chainName;
    this.rpcUrl = rpcUrl;
    this.provider = null;
    this.contract = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // Celer cBridge contract addresses by chain
    this.contractAddresses = {
      ethereum: "0x5427FEFA711Eff984124bFBB1AB6fbf5E3DA1820",
      bsc: "0xdd90E5E87A2081Dcf039192086DdEBAc64C9d3F4",
      polygon: "0x88DCDC47D2f83a99CF0000FDF667A468bB958a78",
      arbitrum: "0x1619DE6B6B20eD217a58d00f37B9d47C7663feca",
      optimism: "0x9D39Fc627A6d9d9F8C831c16995b209548cc3401",
      avalanche: "0xef3c714c9425a8F3697A9C9DdCaa3A3891457f40",
      fantom: "0x374B8a9f3eC5eB2D97ECA84Ea27aCa45aa1C57EF"
    };
    
    // Celer cBridge ABI for key events
    this.abi = [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" },
          { "indexed": false, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint64", "name": "dstChainId", "type": "uint64" },
          { "indexed": false, "internalType": "uint64", "name": "nonce", "type": "uint64" },
          { "indexed": false, "internalType": "uint32", "name": "maxSlippage", "type": "uint32" }
        ],
        "name": "Send",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint64", "name": "srcChainId", "type": "uint64" },
          { "indexed": false, "internalType": "bytes32", "name": "refId", "type": "bytes32" }
        ],
        "name": "Relay",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" },
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint64", "name": "srcChainId", "type": "uint64" },
          { "indexed": false, "internalType": "bytes32", "name": "refId", "type": "bytes32" }
        ],
        "name": "Receive",
        "type": "event"
      }
    ];
  }

  /**
   * Initialize provider and contract
   */
  async initialize() {
    try {
      console.log(`🔗 Initializing Celer cBridge listener for ${this.chainName}...`);
      
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      
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
      console.error(`❌ Failed to initialize Celer cBridge listener for ${this.chainName}:`, error.message);
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
        protocol: 'CELER_CBRIDGE',
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
          contractAddress: this.contract.target,
          network: this.chainName
        }
      };

      // Extract data based on event type
      switch (eventName) {
        case 'Send':
          bridgeData.sourceAddress = args[0]; // sender
          bridgeData.destinationAddress = args[1]; // receiver
          bridgeData.tokenAddress = args[2]; // token
          bridgeData.amount = ethers.formatEther(args[3]); // amount
          bridgeData.destinationChain = this.getChainName(args[4]); // dstChainId
          bridgeData.metadata.nonce = args[5].toString();
          bridgeData.metadata.maxSlippage = args[6].toString();
          break;
          
        case 'Relay':
          bridgeData.sourceAddress = args[0]; // sender
          bridgeData.destinationAddress = args[1]; // receiver
          bridgeData.tokenAddress = args[2]; // token
          bridgeData.amount = ethers.formatEther(args[3]); // amount
          bridgeData.sourceChain = this.getChainName(args[4]); // srcChainId
          bridgeData.destinationChain = this.chainName;
          bridgeData.metadata.refId = args[5]; // refId
          break;
          
        case 'Receive':
          bridgeData.sourceAddress = args[0]; // sender
          bridgeData.destinationAddress = args[1]; // receiver
          bridgeData.tokenAddress = args[2]; // token
          bridgeData.amount = ethers.formatEther(args[3]); // amount
          bridgeData.sourceChain = this.getChainName(args[4]); // srcChainId
          bridgeData.destinationChain = this.chainName;
          bridgeData.metadata.refId = args[5]; // refId
          break;
      }

      // Log the event
      console.log(`📡 Celer cBridge ${eventName} on ${this.chainName}:`);
      console.log(`   TX: ${txHash}`);
      console.log(`   From: ${bridgeData.sourceChain} -> To: ${bridgeData.destinationChain}`);
      console.log(`   Amount: ${bridgeData.amount} tokens`);
      console.log(`   Token: ${bridgeData.tokenAddress}`);

      // Export via callback if provided
      if (this.onEventCallback) {
        await this.onEventCallback(bridgeData);
      }

      return bridgeData;
    } catch (error) {
      console.error(`❌ Error handling Celer cBridge ${eventName} event:`, error.message);
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

    console.log(`🎧 Setting up Celer cBridge event listeners for ${this.chainName}...`);

    // Listen to Send events (outgoing transfers)
    this.contract.on('Send', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Send', args.slice(0, -1), event);
    });

    // Listen to Relay events (relay transfers)
    this.contract.on('Relay', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Relay', args.slice(0, -1), event);
    });

    // Listen to Receive events (incoming transfers)
    this.contract.on('Receive', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('Receive', args.slice(0, -1), event);
    });

    console.log(`✅ Celer cBridge event listeners set up for ${this.chainName}`);
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

      console.log(`🚀 Celer cBridge watcher started for ${this.chainName}`);
      
      // Set up error handling and reconnection
      this.provider.on('error', async (error) => {
        console.error(`❌ Celer cBridge provider error on ${this.chainName}:`, error.message);
        await this.handleReconnect();
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to start Celer cBridge monitoring for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for Celer cBridge ${this.chainName}`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect Celer cBridge ${this.chainName} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.stopMonitoring();
        await this.startMonitoring(this.onEventCallback);
        console.log(`✅ Celer cBridge reconnection successful for ${this.chainName}`);
      } catch (error) {
        console.error(`❌ Celer cBridge reconnection failed for ${this.chainName}:`, error.message);
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
      console.log(`🛑 Celer cBridge watcher stopped for ${this.chainName}`);
    } catch (error) {
      console.error(`❌ Error stopping Celer cBridge monitoring for ${this.chainName}:`, error.message);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      protocol: 'CELER_CBRIDGE',
      chain: this.chainName,
      isListening: this.isListening,
      contractAddress: this.contract?.target,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Start Celer cBridge watcher
 * @param {string} chainName - Chain name (ethereum, bsc, polygon, etc.)
 * @param {string} rpcUrl - RPC URL for the chain
 * @param {function} onEventCallback - Optional callback for events
 * @returns {CbridgeListener} - Bridge listener instance
 */
async function startBridgeWatcher(chainName, rpcUrl, onEventCallback = null) {
  const listener = new CbridgeListener(chainName, rpcUrl);
  await listener.startMonitoring(onEventCallback);
  return listener;
}

module.exports = {
  CbridgeListener,
  startBridgeWatcher
}; 