const { ChainProvider } = require('./chainProviders');
const { ethers } = require('ethers');

class USDTTracingService {
  constructor() {
    this.providers = {
      ethereum: new ChainProvider('ethereum'),
      bsc: new ChainProvider('bsc'),
      polygon: new ChainProvider('polygon'),
      arbitrum: new ChainProvider('arbitrum')
    };
    
    // USDT contract addresses on different chains
    this.usdtAddresses = {
      ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      bsc: '0x55d398326f99059fF775485246999027B3197955',
      polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    };
    
    // ERC20 Transfer event signature
    this.transferTopic = ethers.utils.id("Transfer(address,address,uint256)");
  }

  /**
   * Safely fetch USDT logs in optimized chunks to avoid RPC log limit
   */
  async fetchUSDTLogsChunked({
    chain = 'bsc',
    fromBlock,
    toBlock,
    step = 250, // recommended: 250-500 for USDT
    address = null, // specific address to filter
    topics = [this.transferTopic]
  }) {
    // Guard: invalid range or step
    if (fromBlock > toBlock || step < 1) {
      console.warn(`[GUARD] Skipping fetch: fromBlock (${fromBlock}) > toBlock (${toBlock}) or step (${step}) < 1`);
      return [];
    }
    const provider = this.providers[chain];
    const usdtAddress = this.usdtAddresses[chain];
    const logs = [];

    console.log(`🔍 Fetching USDT logs on ${chain}: ${fromBlock} → ${toBlock} (step: ${step})`);

    for (let block = fromBlock; block <= toBlock; block += step) {
      const chunkFrom = block;
      const chunkTo = Math.min(toBlock, block + step - 1);

      try {
        console.log(`⏳ Fetching logs: ${chunkFrom} → ${chunkTo} (${chunkTo - chunkFrom + 1} blocks)`);
        
        const filter = {
          address: usdtAddress,
          topics: topics,
          fromBlock: '0x' + chunkFrom.toString(16),
          toBlock: '0x' + chunkTo.toString(16)
        };

        // Add address filter if specified
        if (address) {
          filter.topics.push(
            null, // from address (any)
            '0x' + '0'.repeat(24) + address.slice(2) // to address (specific)
          );
        }

        const chunkLogs = await provider.makeRpcCall('eth_getLogs', [filter]);
        logs.push(...chunkLogs);
        
        console.log(`✅ Got ${chunkLogs.length} logs from block ${chunkFrom} to ${chunkTo}`);

        // Adaptive delay based on log volume
        if (chunkLogs.length > 100) {
          await new Promise(resolve => setTimeout(resolve, 300)); // Longer delay for high volume
        } else if (chunkLogs.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 150)); // Standard delay
        }

      } catch (err) {
        console.warn(`⚠️ Failed ${chunkFrom} → ${chunkTo}:`, err.code || err.message);
        
        // If we hit a limit error, try with even smaller chunks
        if (err.message.includes('too many results') || err.message.includes('limit exceeded')) {
          const smallerStep = Math.floor(step / 2);
          if (smallerStep >= 1) {
            const retryLogs = await this.fetchUSDTLogsChunked({
              chain,
              fromBlock: chunkFrom,
              toBlock: chunkTo,
              step: smallerStep,
              address,
              topics
            });
            logs.push(...retryLogs);
          } else {
            console.warn(`[GUARD] Cannot retry with step < 1 (step was ${smallerStep}). Skipping block range ${chunkFrom} → ${chunkTo}`);
          }
          
          // Abort on repeated limit errors for single blocks
          if (step === 1 && err.message.includes('limit exceeded')) {
            console.error(`[ABORT] Provider refuses even single-block log fetch for block ${chunkFrom}. Aborting further attempts for this range.`);
            break; // Exit the loop for this block range
          }
        }
      }
    }

    return logs;
  }

  /**
   * Trace USDT transfers for a specific address
   */
  async traceUSDTTransfers(address, chain = 'bsc', options = {}) {
    const {
      fromBlock = null,
      toBlock = null,
      limit = 50,
      includeZeroTransfers = false
    } = options;

    try {
      console.log(`🔍 Tracing USDT transfers for ${address} on ${chain}`);

      // Determine block range
      let startBlock, endBlock;
      if (fromBlock && toBlock) {
        startBlock = fromBlock;
        endBlock = toBlock;
      } else {
        // Default: last 10,000 blocks
        const latestBlock = await this.providers[chain].makeRpcCall('eth_blockNumber', []);
        const latestBlockNum = parseInt(latestBlock, 16);
        startBlock = Math.max(0, latestBlockNum - 10000);
        endBlock = latestBlockNum;
      }

      // Fetch USDT transfer logs
      const logs = await this.fetchUSDTLogsChunked({
        chain,
        fromBlock: startBlock,
        toBlock: endBlock,
        address: address,
        topics: [this.transferTopic]
      });

      // Parse and filter transfers
      const transfers = [];
      for (const log of logs) {
        try {
          const fromAddress = '0x' + log.topics[1].slice(26);
          const toAddress = '0x' + log.topics[2].slice(26);
          const value = parseInt(log.data, 16);
          
          // Check if our address is involved
          if (fromAddress.toLowerCase() === address.toLowerCase() ||
              toAddress.toLowerCase() === address.toLowerCase()) {
            
            // Filter out zero transfers unless requested
            if (value > 0 || includeZeroTransfers) {
              transfers.push({
                transactionHash: log.transactionHash,
                blockNumber: parseInt(log.blockNumber, 16),
                from: fromAddress,
                to: toAddress,
                value: value,
                valueFormatted: (value / Math.pow(10, 6)).toFixed(6), // USDT has 6 decimals
                logIndex: log.logIndex,
                chain: chain,
                timestamp: Date.now() // We'll need to get this from block
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse log:`, error.message);
        }
      }

      // Sort by block number (newest first) and limit results
      transfers.sort((a, b) => b.blockNumber - a.blockNumber);
      const limitedTransfers = transfers.slice(0, limit);

      console.log(`✅ Found ${limitedTransfers.length} USDT transfers for ${address} on ${chain}`);
      
      return {
        address: address,
        chain: chain,
        totalTransfers: transfers.length,
        limitedTransfers: limitedTransfers,
        blockRange: { from: startBlock, to: endBlock },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ USDT tracing failed for ${address} on ${chain}:`, error.message);
      throw error;
    }
  }

  /**
   * Multi-chain USDT tracing
   */
  async traceUSDTMultiChain(address, chains = ['bsc', 'ethereum', 'polygon'], options = {}) {
    const results = {};
    
    for (const chain of chains) {
      try {
        console.log(`🌐 Tracing USDT on ${chain}...`);
        results[chain] = await this.traceUSDTTransfers(address, chain, options);
      } catch (error) {
        console.error(`❌ Failed to trace USDT on ${chain}:`, error.message);
        results[chain] = { error: error.message };
      }
    }

    return {
      address: address,
      chains: chains,
      results: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get USDT balance for an address
   */
  async getUSDTBalance(address, chain = 'bsc') {
    try {
      const provider = this.providers[chain];
      const usdtAddress = this.usdtAddresses[chain];
      
      // ERC20 balanceOf function signature
      const balanceOfSignature = '0x70a08231';
      const paddedAddress = '0x' + '0'.repeat(24) + address.slice(2);
      
      const result = await provider.makeRpcCall('eth_call', [{
        to: usdtAddress,
        data: balanceOfSignature + paddedAddress
      }, 'latest']);
      
      const balance = parseInt(result, 16);
      return {
        address: address,
        chain: chain,
        balance: balance,
        balanceFormatted: (balance / Math.pow(10, 6)).toFixed(6),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to get USDT balance for ${address} on ${chain}:`, error.message);
      throw error;
    }
  }
}

module.exports = { USDTTracingService }; 