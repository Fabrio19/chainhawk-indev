const Web3 = require("web3");
const { storeBridgeTransaction } = require("../bridgeMonitor");

/**
 * Multichain (Anyswap) Bridge Monitor
 */
class MultichainMonitor {
  constructor(network, rpcUrl, contractAddress) {
    this.network = network;
    this.web3 = new Web3(rpcUrl);
    this.contractAddress = contractAddress;
    this.lastProcessedBlock = 0;
  }

  /**
   * Multichain ABI for key events
   */
  getABI() {
    return [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "txhash", type: "bytes32" },
          { indexed: true, name: "token", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
          { indexed: false, name: "fromChainID", type: "uint256" },
          { indexed: false, name: "toChainID", type: "uint256" },
        ],
        name: "LogAnySwapIn",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
          { indexed: false, name: "fromChainID", type: "uint256" },
          { indexed: false, name: "toChainID", type: "uint256" },
        ],
        name: "LogAnySwapOut",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
          { indexed: false, name: "fromChainID", type: "uint256" },
          { indexed: false, name: "toChainID", type: "uint256" },
        ],
        name: "SwapIn",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
          { indexed: false, name: "fromChainID", type: "uint256" },
          { indexed: false, name: "toChainID", type: "uint256" },
        ],
        name: "SwapOut",
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
   * Process Multichain events
   */
  async processEvents(fromBlock, toBlock) {
    try {
      const contract = new this.web3.eth.Contract(this.getABI(), this.contractAddress);
      
      // Get events for the block range
      const events = await contract.getPastEvents("allEvents", {
        fromBlock,
        toBlock,
      });

      console.log(`🔍 Found ${events.length} Multichain events on ${this.network}`);

      for (const event of events) {
        await this.processEvent(event);
      }

      this.lastProcessedBlock = toBlock;
    } catch (error) {
      console.error(`Error processing Multichain events on ${this.network}:`, error);
    }
  }

  /**
   * Process individual event
   */
  async processEvent(event) {
    try {
      let bridgeData = null;

      switch (event.event) {
        case "LogAnySwapIn":
          bridgeData = {
            protocol: "MULTICHAIN",
            sourceChain: this.getChainName(event.returnValues.fromChainID),
            destinationChain: this.network,
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "SwapIn",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              fromChainID: event.returnValues.fromChainID,
              toChainID: event.returnValues.toChainID,
            },
          };
          break;

        case "LogAnySwapOut":
          bridgeData = {
            protocol: "MULTICHAIN",
            sourceChain: this.network,
            destinationChain: this.getChainName(event.returnValues.toChainID),
            sourceAddress: event.returnValues.from,
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "SwapOut",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              fromChainID: event.returnValues.fromChainID,
              toChainID: event.returnValues.toChainID,
            },
          };
          break;

        case "SwapIn":
          bridgeData = {
            protocol: "MULTICHAIN",
            sourceChain: this.getChainName(event.returnValues.fromChainID),
            destinationChain: this.network,
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "SwapIn",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              fromChainID: event.returnValues.fromChainID,
              toChainID: event.returnValues.toChainID,
            },
          };
          break;

        case "SwapOut":
          bridgeData = {
            protocol: "MULTICHAIN",
            sourceChain: this.network,
            destinationChain: this.getChainName(event.returnValues.toChainID),
            sourceAddress: event.returnValues.from,
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "SwapOut",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              fromChainID: event.returnValues.fromChainID,
              toChainID: event.returnValues.toChainID,
            },
          };
          break;
      }

      if (bridgeData) {
        await storeBridgeTransaction(bridgeData);
        console.log(`🔗 Processed Multichain ${bridgeData.eventType} event: ${bridgeData.txHash}`);
      }
    } catch (error) {
      console.error(`Error processing Multichain event:`, error);
    }
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    console.log(`🚀 Starting Multichain monitoring on ${this.network}`);
    
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

module.exports = MultichainMonitor; 