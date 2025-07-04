require('dotenv').config();
const { ethers } = require('ethers');
const AddressValidator = require('../../utils/addressValidator');

/**
 * Synapse Bridge Listener
 * Monitors Synapse Protocol cross-chain bridge events
 */
class SynapseListener {
  constructor(chainName, rpcUrl) {
    this.chainName = chainName;
    this.rpcUrl = rpcUrl;
    this.provider = null;
    this.contract = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // Synapse contract addresses by chain
    let rawAddresses = {
      ethereum: "0x0000000000000000000000000000000000000000",
      bsc: "0x749F37Df06A99D6A8E065dd065f8cF947ca23697", // Valid BSC Synapse address
      polygon: "0x0000000000000000000000000000000000000000",
      arbitrum: "0x0000000000000000000000000000000000000000",
      optimism: "0x0000000000000000000000000000000000000000",
      avalanche: "0x0000000000000000000000000000000000000000",
      fantom: "0x0000000000000000000000000000000000000000"
    };
    this.contractAddresses = AddressValidator.validateContractAddresses(rawAddresses, 'synapse');
    
    // Synapse ABI for key events
    this.abi = [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
          { "indexed": false, "internalType": "address", "name": "swapToken", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "swapAmount", "type": "uint256" },
          { "indexed": true, "internalType": "uint256", "name": "toChainId", "type": "uint256" }
        ],
        "name": "TokenSwap",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "toChainId", "type": "uint256" }
        ],
        "name": "TokenDeposit",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "fromChainId", "type": "uint256" }
        ],
        "name": "TokenRedeem",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "fromChainId", "type": "uint256" }
        ],
        "name": "TokenRedeemAndSwap",
        "type": "event"
      }
    ];
  }

  /**
   * Initialize provider and contract
   */
  async initialize() {
    try {
      console.log(`🔗 Initializing Synapse listener for ${this.chainName}...`);
      
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
      console.error(`❌ Failed to initialize Synapse listener for ${this.chainName}:`, error.message);
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
        protocol: 'SYNAPSE',
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
        case 'TokenSwap':
          bridgeData.tokenAddress = args[0]; // token
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.destinationAddress = args[2]; // to
          bridgeData.destinationChain = this.getChainName(args[5]); // toChainId
          bridgeData.metadata.swapToken = args[3];
          bridgeData.metadata.swapAmount = ethers.utils.formatEther(args[4]);
          break;
          
        case 'TokenDeposit':
          bridgeData.tokenAddress = args[0]; // token
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.destinationAddress = args[2]; // to
          bridgeData.destinationChain = this.getChainName(args[3]); // toChainId
          break;
          
        case 'TokenRedeem':
          bridgeData.tokenAddress = args[0]; // token
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.destinationAddress = args[2]; // to
          bridgeData.sourceChain = this.getChainName(args[3]); // fromChainId
          bridgeData.destinationChain = this.chainName;
          break;
          
        case 'TokenRedeemAndSwap':
          bridgeData.tokenAddress = args[0]; // token
          bridgeData.amount = ethers.utils.formatEther(args[1]); // amount
          bridgeData.destinationAddress = args[2]; // to
          bridgeData.sourceChain = this.getChainName(args[3]); // fromChainId
          bridgeData.destinationChain = this.chainName;
          break;
      }

      // Log the event
      console.log(`📡 Synapse ${eventName} on ${this.chainName}:`);
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
      console.error(`❌ Error handling Synapse ${eventName} event:`, error.message);
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

    console.log(`🎧 Setting up Synapse event listeners for ${this.chainName}...`);

    // Listen to TokenSwap events
    this.contract.on('TokenSwap', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TokenSwap', args.slice(0, -1), event);
    });

    // Listen to TokenDeposit events
    this.contract.on('TokenDeposit', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TokenDeposit', args.slice(0, -1), event);
    });

    // Listen to TokenRedeem events
    this.contract.on('TokenRedeem', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TokenRedeem', args.slice(0, -1), event);
    });

    // Listen to TokenRedeemAndSwap events
    this.contract.on('TokenRedeemAndSwap', async (...args) => {
      const event = args[args.length - 1];
      await this.handleEvent('TokenRedeemAndSwap', args.slice(0, -1), event);
    });

    console.log(`✅ Synapse event listeners set up for ${this.chainName}`);
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

      console.log(`🚀 Synapse bridge watcher started for ${this.chainName}`);
      
      // Set up error handling and reconnection
      this.provider.on('error', async (error) => {
        console.error(`❌ Synapse provider error on ${this.chainName}:`, error.message);
        await this.handleReconnect();
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to start Synapse monitoring for ${this.chainName}:`, error.message);
      return false;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for Synapse ${this.chainName}`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect Synapse ${this.chainName} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.stopMonitoring();
        await this.startMonitoring(this.onEventCallback);
        console.log(`✅ Synapse reconnection successful for ${this.chainName}`);
      } catch (error) {
        console.error(`❌ Synapse reconnection failed for ${this.chainName}:`, error.message);
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
      console.log(`🛑 Synapse bridge watcher stopped for ${this.chainName}`);
    } catch (error) {
      console.error(`❌ Error stopping Synapse monitoring for ${this.chainName}:`, error.message);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      protocol: 'SYNAPSE',
      chain: this.chainName,
      isListening: this.isListening,
      contractAddress: this.contract?.address,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Start Synapse bridge watcher
 * @param {string} chainName - Chain name (ethereum, bsc, polygon, etc.)
 * @param {string} rpcUrl - RPC URL for the chain
 * @param {function} onEventCallback - Optional callback for events
 * @returns {SynapseListener} - Bridge listener instance
 */
async function startBridgeWatcher(chainName, rpcUrl, onEventCallback = null) {
  const listener = new SynapseListener(chainName, rpcUrl);
  await listener.startMonitoring(onEventCallback);
  return listener;
}

module.exports = {
  SynapseListener,
  startBridgeWatcher
}; 