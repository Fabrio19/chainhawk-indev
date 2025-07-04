const Web3 = require("web3");
const { storeBridgeTransaction } = require("../bridgeMonitor");

/**
 * Stargate (LayerZero) Bridge Monitor
 */
class StargateMonitor {
  constructor(network, rpcUrl, contractAddress) {
    this.network = network;
    this.web3 = new Web3(rpcUrl);
    this.contractAddress = contractAddress;
    this.lastProcessedBlock = 0;
  }

  /**
   * Stargate ABI for key events
   */
  getABI() {
    return [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "poolId", type: "uint16" },
          { indexed: false, name: "token", type: "address" },
          { indexed: false, name: "amountLD", type: "uint256" },
          { indexed: false, name: "amountSD", type: "uint256" },
          { indexed: false, name: "amountLP", type: "uint256" },
          { indexed: false, name: "protocolFee", type: "uint256" },
          { indexed: false, name: "caller", type: "address" },
          { indexed: false, name: "data", type: "bytes" },
          { indexed: false, name: "timestamp", type: "uint256" },
        ],
        name: "Swap",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "dstChainId", type: "uint16" },
          { indexed: false, name: "nonce", type: "uint256" },
          { indexed: false, name: "qty", type: "uint256" },
          { indexed: false, name: "token", type: "address" },
          { indexed: false, name: "amountSD", type: "uint256" },
          { indexed: false, name: "amountLD", type: "uint256" },
          { indexed: false, name: "protocolFee", type: "uint256" },
          { indexed: false, name: "caller", type: "address" },
          { indexed: false, name: "to", type: "address" },
        ],
        name: "Send",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "srcChainId", type: "uint16" },
          { indexed: false, name: "nonce", type: "uint256" },
          { indexed: false, name: "qty", type: "uint256" },
          { indexed: false, name: "token", type: "address" },
          { indexed: false, name: "amountSD", type: "uint256" },
          { indexed: false, name: "amountLD", type: "uint256" },
          { indexed: false, name: "protocolFee", type: "uint256" },
          { indexed: false, name: "caller", type: "address" },
          { indexed: false, name: "to", type: "address" },
        ],
        name: "Receive",
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
   * Process Stargate events
   */
  async processEvents(fromBlock, toBlock) {
    try {
      const contract = new this.web3.eth.Contract(this.getABI(), this.contractAddress);
      
      // Get events for the block range
      const events = await contract.getPastEvents("allEvents", {
        fromBlock,
        toBlock,
      });

      console.log(`🔍 Found ${events.length} Stargate events on ${this.network}`);

      for (const event of events) {
        await this.processEvent(event);
      }

      this.lastProcessedBlock = toBlock;
    } catch (error) {
      console.error(`Error processing Stargate events on ${this.network}:`, error);
    }
  }

  /**
   * Process individual event
   */
  async processEvent(event) {
    try {
      let bridgeData = null;

      switch (event.event) {
        case "Swap":
          bridgeData = {
            protocol: "STARGATE",
            sourceChain: this.network,
            destinationChain: this.network, // Same chain swap
            sourceAddress: event.returnValues.caller,
            destinationAddress: event.returnValues.caller,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amountLD, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "Swap",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              poolId: event.returnValues.poolId,
              amountSD: event.returnValues.amountSD,
              protocolFee: event.returnValues.protocolFee,
            },
          };
          break;

        case "Send":
          bridgeData = {
            protocol: "STARGATE",
            sourceChain: this.network,
            destinationChain: this.getChainName(event.returnValues.dstChainId),
            sourceAddress: event.returnValues.caller,
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amountLD, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "Send",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              dstChainId: event.returnValues.dstChainId,
              nonce: event.returnValues.nonce,
              amountSD: event.returnValues.amountSD,
              protocolFee: event.returnValues.protocolFee,
            },
          };
          break;

        case "Receive":
          bridgeData = {
            protocol: "STARGATE",
            sourceChain: this.getChainName(event.returnValues.srcChainId),
            destinationChain: this.network,
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: event.returnValues.to,
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amountLD, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "Receive",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              srcChainId: event.returnValues.srcChainId,
              nonce: event.returnValues.nonce,
              amountSD: event.returnValues.amountSD,
              protocolFee: event.returnValues.protocolFee,
            },
          };
          break;
      }

      if (bridgeData) {
        await storeBridgeTransaction(bridgeData);
        console.log(`🔗 Processed Stargate ${bridgeData.eventType} event: ${bridgeData.txHash}`);
      }
    } catch (error) {
      console.error(`Error processing Stargate event:`, error);
    }
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    console.log(`🚀 Starting Stargate monitoring on ${this.network}`);
    
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

module.exports = StargateMonitor; 