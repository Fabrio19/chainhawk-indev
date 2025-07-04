const axios = require('axios');

// Chain configuration
const CHAIN_CONFIG = {
  ethereum: {
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d',
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken',
    chainId: 1,
    symbol: 'ETH',
    decimals: 18,
    explorer: 'etherscan'
  },
  bsc: {
    name: 'Binance Smart Chain',
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    apiUrl: 'https://api.bscscan.com/api',
    apiKey: process.env.BSCSCAN_API_KEY || 'YourApiKeyToken',
    chainId: 56,
    symbol: 'BNB',
    decimals: 18,
    explorer: 'bscscan'
  },
  polygon: {
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com/',
    apiUrl: 'https://api.polygonscan.com/api',
    apiKey: process.env.POLYGONSCAN_API_KEY || 'YourApiKeyToken',
    chainId: 137,
    symbol: 'MATIC',
    decimals: 18,
    explorer: 'polygonscan'
  },
  arbitrum: {
    name: 'Arbitrum',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    apiUrl: 'https://api.arbiscan.io/api',
    apiKey: process.env.ARBISCAN_API_KEY || 'YourApiKeyToken',
    chainId: 42161,
    symbol: 'ETH',
    decimals: 18,
    explorer: 'arbiscan'
  }
};

class ChainProvider {
  constructor(chain) {
    this.config = CHAIN_CONFIG[chain];
    if (!this.config) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  async makeRpcCall(method, params = []) {
    try {
      const response = await axios.post(this.config.rpcUrl, {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: 1
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }
      
      return response.data.result;
    } catch (error) {
      console.error(`RPC call failed for ${method}:`, error.message);
      throw error;
    }
  }

  async getTxDetails(hash) {
    console.log(`[DEBUG] getTxDetails: hash=${hash}`);
    const result = await this.makeRpcCall('eth_getTransactionByHash', [hash]);
    console.log(`[DEBUG] getTxDetails: result=`, JSON.stringify(result, null, 2));
    return result;
  }

  async getTxReceipt(hash) {
    const result = await this.makeRpcCall('eth_getTransactionReceipt', [hash]);
    return result;
  }

  async getBlockByNumber(blockNumber) {
    const result = await this.makeRpcCall('eth_getBlockByNumber', [blockNumber, false]);
    return result;
  }

  async getLogsPaginated(fromBlock, toBlock, address = null, topics = [], step = 250) {
    console.log(`[DEBUG] getLogsPaginated: blocks ${fromBlock} to ${toBlock}, step ${step}`);
    
    const allLogs = [];
    const startBlock = parseInt(fromBlock, 16);
    const endBlock = parseInt(toBlock, 16);
    
    // For high-traffic tokens like USDT, use smaller chunks
    const optimizedStep = address && this.isHighTrafficToken(address) ? 250 : step;
    
    for (let i = startBlock; i <= endBlock; i += optimizedStep) {
      const chunkFromBlock = i;
      const chunkToBlock = Math.min(i + optimizedStep - 1, endBlock);
      const chunkFromBlockHex = '0x' + chunkFromBlock.toString(16);
      const chunkToBlockHex = '0x' + chunkToBlock.toString(16);
      
      try {
        console.log(`[DEBUG] Fetching logs: ${chunkFromBlock} → ${chunkToBlock} (${chunkToBlock - chunkFromBlock + 1} blocks)`);
        
        const filter = {
          fromBlock: chunkFromBlockHex,
          toBlock: chunkToBlockHex
        };
        
        if (address) {
          filter.address = address;
        }
        
        if (topics && topics.length > 0) {
          filter.topics = topics;
        }
        
        const logs = await this.makeRpcCall('eth_getLogs', [filter]);
        allLogs.push(...logs);
        
        console.log(`[DEBUG] Got ${logs.length} logs from block ${chunkFromBlock} to ${chunkToBlock}`);
        
        // Adaptive delay based on log volume to avoid rate limiting
        if (logs.length > 100) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Longer delay for high volume
        } else if (logs.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Standard delay
        }
        
      } catch (error) {
        console.warn(`⚠️ Failed to fetch logs from ${chunkFromBlock} → ${chunkToBlock}:`, error.code || error.message);
        
        // If we hit a limit error, try with even smaller chunks
        if (error.message.includes('too many results') || error.message.includes('limit exceeded')) {
          console.log(`[DEBUG] Retrying with smaller chunks for ${chunkFromBlock} → ${chunkToBlock}`);
          const smallerStep = Math.floor(optimizedStep / 2);
          const retryLogs = await this.getLogsPaginated(
            chunkFromBlockHex, 
            chunkToBlockHex, 
            address, 
            topics, 
            smallerStep
          );
          allLogs.push(...retryLogs);
        }
      }
    }
    
    console.log(`[DEBUG] getLogsPaginated: total logs collected: ${allLogs.length}`);
    return allLogs;
  }

  // Helper method to identify high-traffic tokens
  isHighTrafficToken(address) {
    const highTrafficTokens = [
      '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
      '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C', // USDC on Ethereum
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC on BSC
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI on Ethereum
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'  // WMATIC on Polygon
    ];
    return highTrafficTokens.includes(address.toLowerCase());
  }

  async getAddressTxs(address, limit = 10, blockNumber = null) {
    console.log(`[DEBUG] getAddressTxs: address=${address}, limit=${limit}, blockNumber=${blockNumber}`);
    try {
      // Get the latest block number
      const latestBlock = await this.makeRpcCall('eth_blockNumber', []);
      const latestBlockNum = parseInt(latestBlock, 16);
      let fromBlock, toBlock;
      
      if (blockNumber) {
        // Search ±10 blocks around the given block number
        fromBlock = Math.max(0, blockNumber - 10);
        toBlock = blockNumber + 10;
      } else {
        // Default: last 1000 blocks
        fromBlock = Math.max(0, latestBlockNum - 1000);
        toBlock = latestBlockNum;
      }
      
      const fromBlockHex = '0x' + fromBlock.toString(16);
      const toBlockHex = '0x' + toBlock.toString(16);
      
      console.log(`[DEBUG] getAddressTxs: searching blocks ${fromBlock} to ${toBlock}`);
      
      // Use pagination to avoid rate limits
      const logs = await this.getLogsPaginated(fromBlockHex, toBlockHex, address);
      
      console.log(`[DEBUG] getAddressTxs: found ${logs.length} logs`);
      
      // Convert logs to transaction-like objects
      const transactions = [];
      for (const log of logs.slice(0, limit)) {
        try {
          const tx = await this.getTxDetails(log.transactionHash);
          if (tx) {
            transactions.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              blockNumber: tx.blockNumber,
              timestamp: Date.now() // We'll need to get this from block
            });
          }
        } catch (error) {
          console.log(`[DEBUG] Failed to get tx details for ${log.transactionHash}:`, error.message);
        }
      }
      
      console.log(`[DEBUG] getAddressTxs: returned ${transactions.length} transactions`);
      return transactions;
      
    } catch (error) {
      console.error(`[DEBUG] getAddressTxs failed:`, error.message);
      return [];
    }
  }

  async getERC20Transfers(address, limit = 10, blockNumber = null) {
    console.log(`[DEBUG] getERC20Transfers: address=${address}, limit=${limit}, blockNumber=${blockNumber}`);
    try {
      const latestBlock = await this.makeRpcCall('eth_blockNumber', []);
      const latestBlockNum = parseInt(latestBlock, 16);
      let fromBlock, toBlock;
      
      if (blockNumber) {
        // Search ±10 blocks around the given block number
        fromBlock = Math.max(0, blockNumber - 10);
        toBlock = blockNumber + 10;
      } else {
        // Default: last 1000 blocks
        fromBlock = Math.max(0, latestBlockNum - 1000);
        toBlock = latestBlockNum;
      }
      
      const fromBlockHex = '0x' + fromBlock.toString(16);
      const toBlockHex = '0x' + toBlock.toString(16);
      
      // ERC20 Transfer event signature: Transfer(address,address,uint256)
      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      // Use pagination with topics filter
      const logs = await this.getLogsPaginated(fromBlockHex, toBlockHex, null, [
        transferEventSignature,
        null, // from address
        null  // to address
      ]);
      
      // Filter logs where the address is involved
      const addressLogs = logs.filter(log => {
        const fromAddress = '0x' + log.topics[1].slice(26);
        const toAddress = '0x' + log.topics[2].slice(26);
        return fromAddress.toLowerCase() === address.toLowerCase() ||
               toAddress.toLowerCase() === address.toLowerCase();
      });
      
      console.log(`[DEBUG] getERC20Transfers: found ${addressLogs.length} ERC20 transfers`);
      return addressLogs.slice(0, limit);
      
    } catch (error) {
      console.error(`[DEBUG] getERC20Transfers failed:`, error.message);
      return [];
    }
  }

  async getERC721Transfers(address, limit = 10, blockNumber = null) {
    console.log(`[DEBUG] getERC721Transfers: address=${address}, limit=${limit}, blockNumber=${blockNumber}`);
    try {
      const latestBlock = await this.makeRpcCall('eth_blockNumber', []);
      const latestBlockNum = parseInt(latestBlock, 16);
      let fromBlock, toBlock;
      
      if (blockNumber) {
        // Search ±10 blocks around the given block number
        fromBlock = Math.max(0, blockNumber - 10);
        toBlock = blockNumber + 10;
      } else {
        // Default: last 1000 blocks
        fromBlock = Math.max(0, latestBlockNum - 1000);
        toBlock = latestBlockNum;
      }
      
      const fromBlockHex = '0x' + fromBlock.toString(16);
      const toBlockHex = '0x' + toBlock.toString(16);
      
      // ERC721 Transfer event signature: Transfer(address,address,uint256)
      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      // Use pagination with topics filter
      const logs = await this.getLogsPaginated(fromBlockHex, toBlockHex, null, [
        transferEventSignature,
        null, // from address
        null  // to address
      ]);
      
      // Filter logs where the address is involved
      const addressLogs = logs.filter(log => {
        const fromAddress = '0x' + log.topics[1].slice(26);
        const toAddress = '0x' + log.topics[2].slice(26);
        return fromAddress.toLowerCase() === address.toLowerCase() ||
               toAddress.toLowerCase() === address.toLowerCase();
      });
      
      console.log(`[DEBUG] getERC721Transfers: found ${addressLogs.length} ERC721 transfers`);
      return addressLogs.slice(0, limit);
      
    } catch (error) {
      console.error(`[DEBUG] getERC721Transfers failed:`, error.message);
      return [];
    }
  }

  formatValue(value) {
    return value ? (parseInt(value, 16) / Math.pow(10, this.config.decimals)).toString() : '0';
  }
}

module.exports = { ChainProvider, CHAIN_CONFIG }; 