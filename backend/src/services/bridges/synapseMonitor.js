const Web3 = require("web3");
const { storeBridgeTransaction } = require("../bridgeMonitor");

/**
 * Synapse Protocol Bridge Monitor
 */
class SynapseMonitor {
  constructor(network, rpcUrl, contractAddress) {
    this.network = network;
    this.web3 = new Web3(rpcUrl);
    this.contractAddress = contractAddress;
    this.lastProcessedBlock = 0;
  }

  /**
   * Synapse ABI for key events
   */
  getABI() {
    return [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "swapToken", type: "address" },
          { indexed: false, name: "swapAmount", type: "uint256" },
          { indexed: true, name: "toChainId", type: "uint256" },
        ],
        name: "TokenSwap",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "swapToken", type: "address" },
          { indexed: false, name: "swapAmount", type: "uint256" },
          { indexed: true, name: "toChainId", type: "uint256" },
        ],
        name: "TokenRedeem",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "toChainId", type: "uint256" },
        ],
        name: "TokenDeposit",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "fromChainId", type: "uint256" },
        ],
        name: "TokenRedeemAndSwap",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "fromChainId", type: "uint256" },
        ],
        name: "TokenRedeemAndRemove",
        type: "event",
      },
    ];
  }

  /**
   * Get latest block number
   */
  async getLatestBlock() {
    try {
      return await this.web3.eth.getBlockNumber();
    } catch (error) {
      console.error(`Error getting latest block for ${this.network}:`, error);
      return this.lastProcessedBlock;
    }
  }

  /**
   * Get token symbol from address
   */
  async getTokenSymbol(tokenAddress) {
    try {
      const tokenContract = new this.web3.eth.Contract(
        [
          {
            constant: true,
            inputs: [],
            name: "symbol",
            outputs: [{ name: "", type: "string" }],
            type: "function",
          },
        ],
        tokenAddress
      );
      return await tokenContract.methods.symbol().call();
    } catch (error) {
      console.error(`Error getting token symbol for ${tokenAddress}:`, error);
      return "UNKNOWN";
    }
  }

  /**
   * Map chain ID to chain name
   */
  getChainName(chainId) {
    const chainMap = {
      1: "ethereum",
      56: "bsc",
      137: "polygon",
      43114: "avalanche",
      42161: "arbitrum",
      10: "optimism",
      250: "fantom",
    };
    return chainMap[chainId] || `chain-${chainId}`;
  }

  /**
   * Process Synapse events
   */
  async processEvents(fromBlock, toBlock) {
    try {
      const contract = new this.web3.eth.Contract(this.getABI(), this.contractAddress);
      
      // Get events for the block range
      const events = await contract.getPastEvents("allEvents", {
        fromBlock,
        toBlock,
      });

      console.log(`🔍 Found ${events.length} Synapse events on ${this.network}`);

      for (const event of events) {
        await this.processEvent(event);
      }

      this.lastProcessedBlock = toBlock;
    } catch (error) {
      console.error(`Error processing Synapse events on ${this.network}:`, error);
    }
  }

  /**
   * Process individual event
   */
  async processEvent(event) {
    try {
      let bridgeData = null;

      switch (event.event) {
        case "TokenSwap":
          bridgeData = {
            protocol: "SYNAPSE",
            sourceChain: this.network,
            destinationChain: this.getChainName(event.returnValues.toChainId),
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "TokenSwap",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              toChainId: event.returnValues.toChainId,
              swapToken: event.returnValues.swapToken,
              swapAmount: event.returnValues.swapAmount,
            },
          };
          break;

        case "TokenRedeem":
          bridgeData = {
            protocol: "SYNAPSE",
            sourceChain: "unknown", // Source chain unknown in redeem event
            destinationChain: this.network,
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "TokenRedeem",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              toChainId: event.returnValues.toChainId,
              swapToken: event.returnValues.swapToken,
              swapAmount: event.returnValues.swapAmount,
            },
          };
          break;

        case "TokenDeposit":
          bridgeData = {
            protocol: "SYNAPSE",
            sourceChain: this.network,
            destinationChain: this.getChainName(event.returnValues.toChainId),
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "TokenDeposit",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              toChainId: event.returnValues.toChainId,
            },
          };
          break;

        case "TokenRedeemAndSwap":
          bridgeData = {
            protocol: "SYNAPSE",
            sourceChain: this.getChainName(event.returnValues.fromChainId),
            destinationChain: this.network,
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "TokenRedeemAndSwap",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              fromChainId: event.returnValues.fromChainId,
            },
          };
          break;

        case "TokenRedeemAndRemove":
          bridgeData = {
            protocol: "SYNAPSE",
            sourceChain: this.getChainName(event.returnValues.fromChainId),
            destinationChain: this.network,
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "TokenRedeemAndRemove",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              fromChainId: event.returnValues.fromChainId,
            },
          };
          break;
      }

      if (bridgeData) {
        await storeBridgeTransaction(bridgeData);
        console.log(`🔗 Processed Synapse ${bridgeData.eventType} event: ${bridgeData.txHash}`);
      }
    } catch (error) {
      console.error(`Error processing Synapse event:`, error);
    }
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    console.log(`🚀 Starting Synapse monitoring on ${this.network}`);
    
    // Get initial block
    this.lastProcessedBlock = await this.getLatestBlock();
    
    // Set up polling every 30 seconds
    setInterval(async () => {
      const latestBlock = await this.getLatestBlock();
      if (latestBlock > this.lastProcessedBlock) {
        await this.processEvents(this.lastProcessedBlock + 1, latestBlock);
      }
    }, 30000);
  }
}

module.exports = SynapseMonitor; 