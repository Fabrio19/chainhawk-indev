const { ethers } = require("ethers");
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const { 
  STARGATE_ABI, 
  WORMHOLE_ABI, 
  SYNAPSE_ABI, 
  CELER_ABI,
  ERC20_ABI 
} = require("./abis/bridgeABIs");
const { BRIDGE_CONFIGS } = require("./bridgeConfig");

const prisma = new PrismaClient();

class RealBlockchainListener {
  constructor() {
    this.isListening = false;
    this.eventHandlers = new Map();
    this.monitoringInterval = null;
    this.lastProcessedBlocks = new Map();
  }

  /**
   * Initialize (API mode only)
   */
  async initialize() {
    console.log("🔗 Initializing real blockchain listeners...");
    // Only API-based approach
    console.log("✅ Real blockchain listeners initialized (API mode)");
    return true;
  }

  /**
   * Start listening for events using blockchain APIs
   */
  async startListening() {
    if (this.isListening) {
      console.log("⚠️ Already listening for events");
      return;
    }

    console.log("🎧 Starting real blockchain event listeners...");
    
    // Start polling blockchain APIs for recent transactions
    this.monitoringInterval = setInterval(async () => {
      await this.pollAllBlockchainData();
    }, 60000); // Poll every 60 seconds
    
    this.isListening = true;
    console.log("✅ Real blockchain listeners are now active");
  }

  /**
   * Poll all blockchain data sources
   */
  async pollAllBlockchainData() {
    try {
      console.log("🔍 Polling blockchain data...");
      
      // Poll Ethereum for all bridge protocols
      await this.pollEthereumBridgeTransactions();
      
      // Poll BSC for bridge transactions
      await this.pollBSCBridgeTransactions();
      
      // Poll Polygon for bridge transactions
      await this.pollPolygonBridgeTransactions();
      
      // Poll Arbitrum for bridge transactions
      await this.pollArbitrumBridgeTransactions();
      
    } catch (error) {
      console.error("❌ Error polling blockchain data:", error.message);
    }
  }

  /**
   * Poll Ethereum for bridge transactions using Etherscan API
   */
  async pollEthereumBridgeTransactions() {
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    
    if (!etherscanApiKey || etherscanApiKey === 'YourApiKeyToken') {
      console.log("⚠️ No valid Etherscan API key configured for Ethereum - using public data");
      await this.pollEthereumPublicData();
      return;
    }

    const bridgeContracts = {
      'STARGATE': '0x8731d54E9D02c286767d56ac03e8037C07e01e98',
      'WORMHOLE': '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
      'SYNAPSE': '0x2796317b0fF8538F253012862c06787Adfb8cEb6',
      'CELER': '0x5427FEFA711Eff984124bFBB1AB6fbf5E3DA1820'
    };

    for (const [protocol, contractAddress] of Object.entries(bridgeContracts)) {
      try {
        const response = await axios.get(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${etherscanApiKey}`
        );

        if (response.data.status === '1' && response.data.result) {
          console.log(`📊 Found ${response.data.result.length} ${protocol} transactions on Ethereum`);
          
          for (const tx of response.data.result) {
            await this.processEthereumTransaction(tx, protocol, contractAddress);
          }
        }
      } catch (error) {
        console.error(`Error polling ${protocol} on Ethereum:`, error.message);
      }
    }
  }

  /**
   * Poll Ethereum using public data sources (no API key required)
   */
  async pollEthereumPublicData() {
    try {
      // Use public APIs to get recent bridge transactions
      const stargateRouter = '0x8731d54E9D02c286767d56ac03e8037C07e01e98';
      
      // Try to get recent transactions from public sources
      const response = await axios.get(
        `https://api.etherscan.io/api?module=account&action=txlist&address=${stargateRouter}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc`
      );

      if (response.data.status === '1' && response.data.result) {
        console.log(`📊 Found ${response.data.result.length} Stargate transactions on Ethereum (public data)`);
        
        for (const tx of response.data.result) {
          await this.processEthereumTransaction(tx, 'STARGATE', stargateRouter);
        }
      }
    } catch (error) {
      console.error("Error polling Ethereum public data:", error.message);
    }
  }

  /**
   * Poll BSC for bridge transactions
   */
  async pollBSCBridgeTransactions() {
    const bscscanApiKey = process.env.BSCSCAN_API_KEY;
    
    if (!bscscanApiKey) {
      console.log("⚠️ No BSCScan API key configured");
      return;
    }

    const bridgeContracts = {
      'STARGATE': '0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8',
      'WORMHOLE': '0xB6F6D86a8f9879A9c87f643768d9efb38f1D8e94',
      'SYNAPSE': '0x749F37Df06A36Dc8A7C37C892B39295471C4a9BA',
      'CELER': '0xdd90E5E87A2081Dcf039192086DdEBAc64C9d3F4'
    };

    for (const [protocol, contractAddress] of Object.entries(bridgeContracts)) {
      try {
        const response = await axios.get(
          `https://api.bscscan.com/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${bscscanApiKey}`
        );

        if (response.data.status === '1' && response.data.result) {
          console.log(`📊 Found ${response.data.result.length} ${protocol} transactions on BSC`);
          
          for (const tx of response.data.result) {
            await this.processBSCTransaction(tx, protocol, contractAddress);
          }
        }
      } catch (error) {
        console.error(`Error polling ${protocol} on BSC:`, error.message);
      }
    }
  }

  /**
   * Poll Polygon for bridge transactions
   */
  async pollPolygonBridgeTransactions() {
    const polygonscanApiKey = process.env.POLYGONSCAN_API_KEY;
    
    if (!polygonscanApiKey) {
      console.log("⚠️ No PolygonScan API key configured");
      return;
    }

    const bridgeContracts = {
      'STARGATE': '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd',
      'WORMHOLE': '0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE',
      'SYNAPSE': '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5',
      'CELER': '0x88DCDC47D2f83a99CF0000FDF667A468bB958a78'
    };

    for (const [protocol, contractAddress] of Object.entries(bridgeContracts)) {
      try {
        const response = await axios.get(
          `https://api.polygonscan.com/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${polygonscanApiKey}`
        );

        if (response.data.status === '1' && response.data.result) {
          console.log(`📊 Found ${response.data.result.length} ${protocol} transactions on Polygon`);
          
          for (const tx of response.data.result) {
            await this.processPolygonTransaction(tx, protocol, contractAddress);
          }
        }
      } catch (error) {
        console.error(`Error polling ${protocol} on Polygon:`, error.message);
      }
    }
  }

  /**
   * Poll Arbitrum for bridge transactions
   */
  async pollArbitrumBridgeTransactions() {
    const arbiscanApiKey = process.env.ARBISCAN_API_KEY;
    
    if (!arbiscanApiKey) {
      console.log("⚠️ No Arbiscan API key configured");
      return;
    }

    const bridgeContracts = {
      'STARGATE': '0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614',
      'WORMHOLE': '0xa321448d90d4e5b0A732867c18eA198e75CAC48E',
      'SYNAPSE': '0x6f4e8eba4d337f874ab57478acc2cb5bacdc19c9',
      'CELER': '0x1619DE6B6B20eD217a58d00f37B9d47C7663feca'
    };

    for (const [protocol, contractAddress] of Object.entries(bridgeContracts)) {
      try {
        const response = await axios.get(
          `https://api.arbiscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${arbiscanApiKey}`
        );

        if (response.data.status === '1' && response.data.result) {
          console.log(`📊 Found ${response.data.result.length} ${protocol} transactions on Arbitrum`);
          
          for (const tx of response.data.result) {
            await this.processArbitrumTransaction(tx, protocol, contractAddress);
          }
        }
      } catch (error) {
        console.error(`Error polling ${protocol} on Arbitrum:`, error.message);
      }
    }
  }

  /**
   * Process Ethereum transaction and extract bridge data
   */
  async processEthereumTransaction(tx, protocol, contractAddress) {
    try {
      // Create a bridge transaction record
      const bridgeTransaction = {
        bridgeProtocol: protocol,
        sourceChain: 'ethereum',
        destinationChain: 'ethereum', // Will be determined from transaction data
        sourceAddress: tx.from,
        destinationAddress: tx.to,
        tokenAddress: '0xA0b86a33E6441b8c4C8B8C4C8C4C8C4C8C4C8C4C', // Default
        tokenSymbol: 'ETH',
        amount: (parseInt(tx.value) / 1e18).toString(),
        transactionHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber),
        eventType: 'Transfer',
        timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        status: 'COMPLETED',
        riskScore: 0.1,
        riskFlags: [],
        metadata: {
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          protocol: protocol,
          contractAddress: contractAddress,
          realData: true,
          chain: 'ethereum'
        }
      };

      // Save to database
      await this.saveBridgeTransaction(bridgeTransaction);
      
      console.log(`🔗 Processed real ${protocol} transaction on Ethereum: ${tx.hash}`);
    } catch (error) {
      console.error("Error processing Ethereum transaction:", error);
    }
  }

  /**
   * Process BSC transaction
   */
  async processBSCTransaction(tx, protocol, contractAddress) {
    try {
      const bridgeTransaction = {
        bridgeProtocol: protocol,
        sourceChain: 'bsc',
        destinationChain: 'bsc',
        sourceAddress: tx.from,
        destinationAddress: tx.to,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: 'BNB',
        amount: (parseInt(tx.value) / 1e18).toString(),
        transactionHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber),
        eventType: 'Transfer',
        timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        status: 'COMPLETED',
        riskScore: 0.1,
        riskFlags: [],
        metadata: {
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          protocol: protocol,
          contractAddress: contractAddress,
          realData: true,
          chain: 'bsc'
        }
      };

      await this.saveBridgeTransaction(bridgeTransaction);
      console.log(`🔗 Processed real ${protocol} transaction on BSC: ${tx.hash}`);
    } catch (error) {
      console.error("Error processing BSC transaction:", error);
    }
  }

  /**
   * Process Polygon transaction
   */
  async processPolygonTransaction(tx, protocol, contractAddress) {
    try {
      const bridgeTransaction = {
        bridgeProtocol: protocol,
        sourceChain: 'polygon',
        destinationChain: 'polygon',
        sourceAddress: tx.from,
        destinationAddress: tx.to,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: 'MATIC',
        amount: (parseInt(tx.value) / 1e18).toString(),
        transactionHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber),
        eventType: 'Transfer',
        timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        status: 'COMPLETED',
        riskScore: 0.1,
        riskFlags: [],
        metadata: {
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          protocol: protocol,
          contractAddress: contractAddress,
          realData: true,
          chain: 'polygon'
        }
      };

      await this.saveBridgeTransaction(bridgeTransaction);
      console.log(`🔗 Processed real ${protocol} transaction on Polygon: ${tx.hash}`);
    } catch (error) {
      console.error("Error processing Polygon transaction:", error);
    }
  }

  /**
   * Process Arbitrum transaction
   */
  async processArbitrumTransaction(tx, protocol, contractAddress) {
    try {
      const bridgeTransaction = {
        bridgeProtocol: protocol,
        sourceChain: 'arbitrum',
        destinationChain: 'arbitrum',
        sourceAddress: tx.from,
        destinationAddress: tx.to,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: 'ETH',
        amount: (parseInt(tx.value) / 1e18).toString(),
        transactionHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber),
        eventType: 'Transfer',
        timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        status: 'COMPLETED',
        riskScore: 0.1,
        riskFlags: [],
        metadata: {
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          protocol: protocol,
          contractAddress: contractAddress,
          realData: true,
          chain: 'arbitrum'
        }
      };

      await this.saveBridgeTransaction(bridgeTransaction);
      console.log(`🔗 Processed real ${protocol} transaction on Arbitrum: ${tx.hash}`);
    } catch (error) {
      console.error("Error processing Arbitrum transaction:", error);
    }
  }

  /**
   * Save bridge transaction to database
   */
  async saveBridgeTransaction(bridgeTransaction) {
    try {
      // Check if transaction already exists
      const existing = await prisma.bridgeTransaction.findFirst({
        where: { transactionHash: bridgeTransaction.transactionHash }
      });

      if (!existing) {
        await prisma.bridgeTransaction.create({
          data: bridgeTransaction
        });
      }
    } catch (error) {
      console.error("Error saving bridge transaction:", error);
    }
  }

  /**
   * Stop listening
   */
  async stopListening() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isListening = false;
    console.log("🛑 Real blockchain listeners stopped");
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      mode: 'REAL',
      lastPoll: new Date().toISOString(),
    };
  }
}

module.exports = RealBlockchainListener; 