const Web3 = require("web3");
const { storeBridgeTransaction } = require("../bridgeMonitor");

/**
 * Wormhole (Portal) Bridge Monitor
 */
class WormholeMonitor {
  constructor(network, rpcUrl, contractAddress) {
    this.network = network;
    this.web3 = new Web3(rpcUrl);
    this.contractAddress = contractAddress;
    this.lastProcessedBlock = 0;
  }

  /**
   * Wormhole ABI for key events
   */
  getABI() {
    return [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "emitterChainId", type: "uint16" },
          { indexed: true, name: "sequence", type: "uint64" },
          { indexed: false, name: "consistencyLevel", type: "uint8" },
          { indexed: false, name: "payload", type: "bytes" },
        ],
        name: "LogMessagePublished",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "emitterChainId", type: "uint16" },
          { indexed: true, name: "sequence", type: "uint64" },
          { indexed: false, name: "consistencyLevel", type: "uint8" },
          { indexed: false, name: "payload", type: "bytes" },
        ],
        name: "LogMessagePublished",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: true, name: "amount", type: "uint256" },
          { indexed: true, name: "recipientChain", type: "uint16" },
          { indexed: true, name: "recipient", type: "bytes32" },
          { indexed: false, name: "arbiterFee", type: "uint256" },
          { indexed: false, name: "nonce", type: "uint256" },
        ],
        name: "TransferTokens",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: true, name: "amount", type: "uint256" },
          { indexed: true, name: "recipientChain", type: "uint16" },
          { indexed: true, name: "recipient", type: "bytes32" },
          { indexed: false, name: "fee", type: "uint256" },
          { indexed: false, name: "nonce", type: "uint256" },
        ],
        name: "TransferTokensWithPayload",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "token", type: "address" },
          { indexed: true, name: "amount", type: "uint256" },
          { indexed: true, name: "recipientChain", type: "uint16" },
          { indexed: true, name: "recipient", type: "bytes32" },
          { indexed: false, name: "fee", type: "uint256" },
          { indexed: false, name: "nonce", type: "uint256" },
        ],
        name: "Redeem",
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
   * Decode recipient address from bytes32
   */
  decodeRecipient(recipientBytes) {
    try {
      // Remove padding and convert to address
      const addressHex = "0x" + recipientBytes.slice(2, 42);
      return this.web3.utils.toChecksumAddress(addressHex);
    } catch (error) {
      console.error("Error decoding recipient:", error);
      return "0x0000000000000000000000000000000000000000";
    }
  }

  /**
   * Process Wormhole events
   */
  async processEvents(fromBlock, toBlock) {
    try {
      const contract = new this.web3.eth.Contract(this.getABI(), this.contractAddress);
      
      // Get events for the block range
      const events = await contract.getPastEvents("allEvents", {
        fromBlock,
        toBlock,
      });

      console.log(`🔍 Found ${events.length} Wormhole events on ${this.network}`);

      for (const event of events) {
        await this.processEvent(event);
      }

      this.lastProcessedBlock = toBlock;
    } catch (error) {
      console.error(`Error processing Wormhole events on ${this.network}:`, error);
    }
  }

  /**
   * Process individual event
   */
  async processEvent(event) {
    try {
      let bridgeData = null;

      switch (event.event) {
        case "TransferTokens":
          bridgeData = {
            protocol: "WORMHOLE",
            sourceChain: this.network,
            destinationChain: this.getChainName(event.returnValues.recipientChain),
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: this.decodeRecipient(event.returnValues.recipient),
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "TransferTokens",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              recipientChain: event.returnValues.recipientChain,
              arbiterFee: event.returnValues.arbiterFee,
              nonce: event.returnValues.nonce,
            },
          };
          break;

        case "TransferTokensWithPayload":
          bridgeData = {
            protocol: "WORMHOLE",
            sourceChain: this.network,
            destinationChain: this.getChainName(event.returnValues.recipientChain),
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: this.decodeRecipient(event.returnValues.recipient),
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "TransferTokensWithPayload",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              recipientChain: event.returnValues.recipientChain,
              fee: event.returnValues.fee,
              nonce: event.returnValues.nonce,
            },
          };
          break;

        case "Redeem":
          bridgeData = {
            protocol: "WORMHOLE",
            sourceChain: "unknown", // Source chain unknown in redeem event
            destinationChain: this.network,
            sourceAddress: "0x0000000000000000000000000000000000000000", // Unknown source
            destinationAddress: this.decodeRecipient(event.returnValues.recipient),
            tokenAddress: event.returnValues.token,
            tokenSymbol: await this.getTokenSymbol(event.returnValues.token),
            amount: this.web3.utils.fromWei(event.returnValues.amount, "ether"),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventType: "Redeem",
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
              contractAddress: this.contractAddress,
              network: this.network,
              recipientChain: event.returnValues.recipientChain,
              fee: event.returnValues.fee,
              nonce: event.returnValues.nonce,
            },
          };
          break;

        case "LogMessagePublished":
          // This is a generic message event, we'll skip it for now
          // as it doesn't contain specific bridge transfer information
          break;
      }

      if (bridgeData) {
        await storeBridgeTransaction(bridgeData);
        console.log(`🔗 Processed Wormhole ${bridgeData.eventType} event: ${bridgeData.txHash}`);
      }
    } catch (error) {
      console.error(`Error processing Wormhole event:`, error);
    }
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    console.log(`🚀 Starting Wormhole monitoring on ${this.network}`);
    
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

module.exports = WormholeMonitor; 