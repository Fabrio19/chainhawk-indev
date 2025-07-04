const axios = require('axios');
const { ethers } = require('ethers');
const { PrismaClient } = require("@prisma/client");
const rpcProvider = require('../utils/rpcProvider');

class BlockchainDataService {
  constructor() {
    this.prisma = new PrismaClient();
    this.apiKeys = {
      ethereum: process.env.ETHERSCAN_API_KEY || '7C1VZAAYJR6DHBW2HN82G761KM6BV71IRU',
      bsc: process.env.BSCSCAN_API_KEY || '5GTEG9SSJVUGH7TY7H6VMXX3HVINMMM1IV',
      polygon: process.env.POLYGONSCAN_API_KEY || 'YourPolygonScanAPIKey',
      arbitrum: process.env.ARBISCAN_API_KEY || 'YourArbiscanAPIKey',
      optimism: process.env.OPTIMISTIC_ETHERSCAN_API_KEY || 'YourOptimisticEtherscanAPIKey',
      avalanche: process.env.SNOWTRACE_API_KEY || 'YourSnowtraceAPIKey',
      fantom: process.env.FTMSCAN_API_KEY || 'YourFtmScanAPIKey',
      zksync: process.env.ZKSYNC_API_KEY || 'YourZkSyncAPIKey',
      linea: process.env.LINEASCAN_API_KEY || 'YourLineaScanAPIKey',
      base: process.env.BASESCAN_API_KEY || 'YourBaseScanAPIKey',
      bitcoin: process.env.BLOCKSTREAM_API_KEY || null // Bitcoin doesn't require API key for public endpoints
    };
    this.baseUrls = {
      ethereum: 'https://api.etherscan.io/api',
      bsc: 'https://api.bscscan.com/api',
      polygon: 'https://api.polygonscan.com/api',
      arbitrum: 'https://api.arbiscan.io/api',
      optimism: 'https://api-optimistic.etherscan.io/api',
      avalanche: 'https://api.snowtrace.io/api',
      fantom: 'https://api.ftmscan.com/api',
      zksync: 'https://block-explorer-api.mainnet.zksync.io/api',
      linea: 'https://api.lineascan.build/api',
      base: 'https://api.basescan.org/api',
      bitcoin: 'https://blockstream.info/api' // Bitcoin API endpoint
    };
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Test RPC connections
   */
  async testRpcConnections() {
    try {
      console.log('🔍 Testing RPC connections...');
      const results = await rpcProvider.testProviders();
      console.log('✅ RPC Test Results:', JSON.stringify(results, null, 2));
      return results;
    } catch (error) {
      console.error('❌ RPC test failed:', error.message);
      throw error;
    }
  }

  /**
   * Get transaction directly from RPC
   */
  async getTransactionFromRpc(hash, chain = 'ethereum') {
    try {
      console.log(`📡 Fetching ${chain} transaction from RPC: ${hash}`);
      
      const cacheKey = `rpc_tx_${chain}_${hash}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const tx = await rpcProvider.getTransaction(hash, chain);
      const receipt = await rpcProvider.getTransactionReceipt(hash, chain);
      
      const result = {
        hash: hash,
        chain: chain,
        transaction: tx,
        receipt: receipt,
        status: receipt?.status === 1 ? 'success' : 'failed',
        gasUsed: receipt?.gasUsed?.toString(),
        blockNumber: tx?.blockNumber,
        timestamp: null // Would need to get block for timestamp
      };

      this.cacheData(cacheKey, result);
      console.log(`✅ Retrieved ${chain} transaction from RPC: ${hash}`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching ${chain} transaction from RPC:`, error.message);
      throw error;
    }
  }

  /**
   * Get balance directly from RPC
   */
  async getBalanceFromRpc(address, chain = 'ethereum') {
    try {
      console.log(`📡 Fetching ${chain} balance from RPC: ${address}`);
      
      const cacheKey = `rpc_balance_${chain}_${address}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const balance = await rpcProvider.getBalance(address, chain);
      const formattedBalance = rpcProvider.formatAddress(address);
      
      const result = {
        address: formattedBalance,
        chain: chain,
        balance: balance.toString(),
        balanceFormatted: ethers.utils.formatEther(balance),
        timestamp: new Date().toISOString()
      };

      this.cacheData(cacheKey, result);
      console.log(`✅ Retrieved ${chain} balance from RPC: ${formattedBalance} - ${result.balanceFormatted}`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching ${chain} balance from RPC:`, error.message);
      throw error;
    }
  }

  /**
   * Get block information from RPC
   */
  async getBlockFromRpc(blockNumber, chain = 'ethereum') {
    try {
      console.log(`📡 Fetching ${chain} block from RPC: ${blockNumber}`);
      
      const cacheKey = `rpc_block_${chain}_${blockNumber}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const block = await rpcProvider.getBlock(blockNumber, chain);
      
      const result = {
        blockNumber: blockNumber,
        chain: chain,
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: block.timestamp,
        transactions: block.transactions.length,
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        miner: block.miner,
        difficulty: block.difficulty.toString()
      };

      this.cacheData(cacheKey, result);
      console.log(`✅ Retrieved ${chain} block from RPC: ${blockNumber}`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching ${chain} block from RPC:`, error.message);
      throw error;
    }
  }

  /**
   * Get contract code from RPC
   */
  async getContractCodeFromRpc(address, chain = 'ethereum') {
    try {
      console.log(`📡 Fetching ${chain} contract code from RPC: ${address}`);
      
      const cacheKey = `rpc_code_${chain}_${address}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const code = await rpcProvider.getCode(address, chain);
      const formattedAddress = rpcProvider.formatAddress(address);
      
      const result = {
        address: formattedAddress,
        chain: chain,
        code: code,
        isContract: code !== '0x',
        codeLength: code.length,
        timestamp: new Date().toISOString()
      };

      this.cacheData(cacheKey, result);
      console.log(`✅ Retrieved ${chain} contract code from RPC: ${formattedAddress} (${result.isContract ? 'Contract' : 'EOA'})`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching ${chain} contract code from RPC:`, error.message);
      throw error;
    }
  }

  /**
   * Get gas price from RPC
   */
  async getGasPriceFromRpc(chain = 'ethereum') {
    try {
      console.log(`📡 Fetching ${chain} gas price from RPC...`);
      
      const cacheKey = `rpc_gas_${chain}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const gasPrice = await rpcProvider.getGasPrice(chain);
      
      const result = {
        chain: chain,
        gasPrice: gasPrice.toString(),
        gasPriceGwei: ethers.utils.formatUnits(gasPrice, 'gwei'),
        timestamp: new Date().toISOString()
      };

      this.cacheData(cacheKey, result);
      console.log(`✅ Retrieved ${chain} gas price from RPC: ${result.gasPriceGwei} Gwei`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching ${chain} gas price from RPC:`, error.message);
      throw error;
    }
  }

  /**
   * Parse transaction data with ABI
   */
  parseTransactionData(abi, data) {
    try {
      return rpcProvider.parseTransactionData(abi, data);
    } catch (error) {
      console.error('❌ Error parsing transaction data:', error.message);
      return null;
    }
  }

  /**
   * Parse event logs with ABI
   */
  parseEventLogs(abi, logs) {
    try {
      return rpcProvider.parseEventLogs(abi, logs);
    } catch (error) {
      console.error('❌ Error parsing event logs:', error.message);
      return [];
    }
  }

  /**
   * Get comprehensive blockchain data (API + RPC)
   */
  async getComprehensiveData(address, chain = 'ethereum') {
    try {
      console.log(`🔍 Getting comprehensive ${chain} data for ${address}...`);

      // Get data from both API and RPC
      const [apiData, rpcData] = await Promise.allSettled([
        this.getWalletAnalysis(address, chain),
        this.getBalanceFromRpc(address, chain)
      ]);

      const result = {
        address: address,
        chain: chain,
        timestamp: new Date().toISOString(),
        apiData: apiData.status === 'fulfilled' ? apiData.value : null,
        rpcData: rpcData.status === 'fulfilled' ? rpcData.value : null,
        errors: {
          api: apiData.status === 'rejected' ? apiData.reason.message : null,
          rpc: rpcData.status === 'rejected' ? rpcData.reason.message : null
        }
      };

      console.log(`✅ Comprehensive ${chain} data retrieved for ${address}`);
      return result;
    } catch (error) {
      console.error(`❌ Error getting comprehensive ${chain} data:`, error.message);
      throw error;
    }
  }

  /**
   * 1. Fetch Real Wallet Transaction History
   * GET https://api.etherscan.io/api?module=account&action=txlist&address=0x...&apikey=7C1...
   */
  async getWalletTransactions(address, chain = 'ethereum', page = 1, offset = 100) {
    try {
      console.log(`📡 Fetching ${chain} transactions for ${address}...`);
      
      const cacheKey = `tx_${chain}_${address}_${page}_${offset}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(this.baseUrls[chain], {
        params: {
          module: 'account',
          action: 'txlist',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: page,
          offset: offset,
          sort: 'desc',
          apikey: this.apiKeys[chain]
        },
        timeout: 30000
      });

      if (response.data.status === '1') {
        const transactions = response.data.result.map(tx => this.formatTransaction(tx, chain));
        
        const result = {
          address: address,
          chain: chain,
          transactions: transactions,
          total: response.data.result.length,
          page: page,
          offset: offset
        };

        this.cacheData(cacheKey, result);
        console.log(`✅ Fetched ${transactions.length} ${chain} transactions for ${address}`);
        return result;
      } else {
        console.error(`API Error for ${chain}:`, response.data);
        throw new Error(`API Error: ${response.data.message || response.data.result || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${chain} transactions for ${address}:`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * 2. Get ERC-20 Token Transfers
   * GET https://api.etherscan.io/api?module=account&action=tokentx&address=0x...&apikey=7C1...
   */
  async getTokenTransfers(address, chain = 'ethereum', page = 1, offset = 100) {
    try {
      console.log(`📡 Fetching ${chain} token transfers for ${address}...`);
      
      const cacheKey = `token_${chain}_${address}_${page}_${offset}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(this.baseUrls[chain], {
        params: {
          module: 'account',
          action: 'tokentx',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: page,
          offset: offset,
          sort: 'desc',
          apikey: this.apiKeys[chain]
        },
        timeout: 30000
      });

      if (response.data.status === '1') {
        const transfers = response.data.result.map(tx => this.formatTokenTransfer(tx, chain));
        
        const result = {
          address: address,
          chain: chain,
          transfers: transfers,
          total: response.data.result.length,
          page: page,
          offset: offset
        };

        this.cacheData(cacheKey, result);
        console.log(`✅ Fetched ${transfers.length} ${chain} token transfers for ${address}`);
        return result;
      } else {
        console.error(`API Error for ${chain}:`, response.data);
        throw new Error(`API Error: ${response.data.message || response.data.result || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${chain} token transfers for ${address}:`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * 3. Smart Contract Verification
   * GET https://api.etherscan.io/api?module=contract&action=getabi&address=0x...&apikey=7C1...
   */
  async getContractABI(contractAddress, chain = 'ethereum') {
    try {
      console.log(`📡 Fetching ${chain} contract ABI for ${contractAddress}...`);
      
      const cacheKey = `abi_${chain}_${contractAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(this.baseUrls[chain], {
        params: {
          module: 'contract',
          action: 'getabi',
          address: contractAddress,
          apikey: this.apiKeys[chain]
        },
        timeout: 30000
      });

      if (response.data.status === '1') {
        const abi = JSON.parse(response.data.result);
        
        this.cacheData(cacheKey, abi);
        console.log(`✅ Fetched ${chain} contract ABI for ${contractAddress}`);
        return abi;
      } else {
        console.error(`API Error for ${chain}:`, response.data);
        throw new Error(`API Error: ${response.data.message || response.data.result || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${chain} contract ABI for ${contractAddress}:`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * 4. Trace Internal Transactions
   * GET https://api.etherscan.io/api?module=account&action=txlistinternal&address=0x...&apikey=7C1...
   */
  async getInternalTransactions(address, chain = 'ethereum', page = 1, offset = 100) {
    try {
      console.log(`📡 Fetching ${chain} internal transactions for ${address}...`);
      
      const cacheKey = `internal_${chain}_${address}_${page}_${offset}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(this.baseUrls[chain], {
        params: {
          module: 'account',
          action: 'txlistinternal',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: page,
          offset: offset,
          sort: 'desc',
          apikey: this.apiKeys[chain]
        },
        timeout: 30000
      });

      if (response.data.status === '1') {
        const internalTxs = response.data.result.map(tx => this.formatInternalTransaction(tx, chain));
        
        const result = {
          address: address,
          chain: chain,
          internalTransactions: internalTxs,
          total: response.data.result.length,
          page: page,
          offset: offset
        };

        this.cacheData(cacheKey, result);
        console.log(`✅ Fetched ${internalTxs.length} ${chain} internal transactions for ${address}`);
        return result;
      } else {
        console.error(`API Error for ${chain}:`, response.data);
        throw new Error(`API Error: ${response.data.message || response.data.result || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${chain} internal transactions for ${address}:`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * 5. Check Token Balance / Supply / Info
   * GET https://api.etherscan.io/api?module=account&action=tokenbalance...
   */
  async getTokenBalance(contractAddress, walletAddress, chain = 'ethereum') {
    try {
      console.log(`📡 Fetching ${chain} token balance for ${walletAddress} on ${contractAddress}...`);
      
      const cacheKey = `balance_${chain}_${contractAddress}_${walletAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(this.baseUrls[chain], {
        params: {
          module: 'account',
          action: 'tokenbalance',
          contractaddress: contractAddress,
          address: walletAddress,
          tag: 'latest',
          apikey: this.apiKeys[chain]
        },
        timeout: 30000
      });

      if (response.data.status === '1') {
        const balance = response.data.result;
        
        // Get token info
        const tokenInfo = await this.getTokenInfo(contractAddress, chain);
        
        const result = {
          contractAddress: contractAddress,
          walletAddress: walletAddress,
          chain: chain,
          balance: balance,
          balanceFormatted: this.formatTokenAmount(balance, tokenInfo.decimals),
          tokenInfo: tokenInfo
        };

        this.cacheData(cacheKey, result);
        console.log(`✅ Fetched ${chain} token balance for ${walletAddress}: ${result.balanceFormatted}`);
        return result;
      } else {
        console.error(`API Error for ${chain}:`, response.data);
        throw new Error(`API Error: ${response.data.message || response.data.result || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${chain} token balance:`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get comprehensive wallet analysis
   */
  async getWalletAnalysis(address, chain = 'ethereum') {
    try {
      console.log(`🔍 Analyzing ${chain} wallet: ${address}...`);

      // Fetch all data in parallel
      const [transactions, tokenTransfers, internalTxs] = await Promise.all([
        this.getWalletTransactions(address, chain, 1, 100),
        this.getTokenTransfers(address, chain, 1, 100),
        this.getInternalTransactions(address, chain, 1, 100)
      ]);

      // Analyze transaction patterns
      const analysis = {
        address: address,
        chain: chain,
        summary: {
          totalTransactions: transactions.total,
          totalTokenTransfers: tokenTransfers.total,
          totalInternalTransactions: internalTxs.total,
          firstSeen: this.getFirstSeen(transactions.transactions),
          lastSeen: this.getLastSeen(transactions.transactions),
          totalVolume: this.calculateTotalVolume(transactions.transactions),
          tokenVolume: this.calculateTokenVolume(tokenTransfers.transfers)
        },
        riskIndicators: this.analyzeRiskIndicators(transactions, tokenTransfers, internalTxs),
        tokenHoldings: await this.getTokenHoldings(address, chain),
        transactionHistory: transactions.transactions.slice(0, 20), // Last 20 transactions
        tokenTransfers: tokenTransfers.transfers.slice(0, 20), // Last 20 token transfers
        internalTransactions: internalTxs.internalTransactions.slice(0, 20) // Last 20 internal txs
      };

      console.log(`✅ Wallet analysis completed for ${address}`);
      return analysis;
    } catch (error) {
      console.error(`❌ Error analyzing wallet ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Get token holdings for a wallet
   */
  async getTokenHoldings(address, chain = 'ethereum') {
    try {
      // Get recent token transfers to identify held tokens
      const tokenTransfers = await this.getTokenTransfers(address, chain, 1, 1000);
      
      const tokenMap = new Map();
      
      for (const transfer of tokenTransfers.transfers) {
        const tokenAddress = transfer.contractAddress;
        
        if (!tokenMap.has(tokenAddress)) {
          try {
            const balance = await this.getTokenBalance(tokenAddress, address, chain);
            if (parseFloat(balance.balance) > 0) {
              tokenMap.set(tokenAddress, balance);
            }
          } catch (error) {
            // Skip tokens that can't be queried
            continue;
          }
        }
      }

      return Array.from(tokenMap.values());
    } catch (error) {
      console.error(`❌ Error getting token holdings for ${address}:`, error.message);
      return [];
    }
  }

  /**
   * Analyze risk indicators
   */
  analyzeRiskIndicators(transactions, tokenTransfers, internalTxs) {
    const indicators = {
      highValueTransfers: 0,
      frequentTransfers: 0,
      mixerInteractions: 0,
      suspiciousPatterns: 0,
      riskScore: 0
    };

    // Check for high-value transfers
    const highValueThreshold = 1000000000000000000; // 1 ETH
    indicators.highValueTransfers = transactions.transactions.filter(tx => 
      parseFloat(tx.value) > highValueThreshold
    ).length;

    // Check for frequent transfers (more than 10 in a day)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTxs = transactions.transactions.filter(tx => 
      new Date(tx.timestamp * 1000) > oneDayAgo
    );
    indicators.frequentTransfers = recentTxs.length > 10 ? recentTxs.length : 0;

    // Check for mixer interactions
    const knownMixers = [
      '0x722122df12d4e14e13ac3b6895a86e84145b6967', // Tornado Cash
      '0xdd4c48c0b24039969fc16d1cdf626eab821d3384', // Tornado Cash
      '0xd90e2f925da45b61b4fcc9a9f14c6671013c14e7'  // Tornado Cash
    ];
    
    indicators.mixerInteractions = transactions.transactions.filter(tx =>
      knownMixers.includes(tx.to.toLowerCase()) || knownMixers.includes(tx.from.toLowerCase())
    ).length;

    // Calculate risk score
    indicators.riskScore = Math.min(
      (indicators.highValueTransfers * 10) +
      (indicators.frequentTransfers * 5) +
      (indicators.mixerInteractions * 50),
      100
    );

    return indicators;
  }

  /**
   * Format transaction data
   */
  formatTransaction(tx, chain) {
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      valueFormatted: this.formatEthAmount(tx.value),
      gas: tx.gas,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp),
      nonce: parseInt(tx.nonce),
      transactionIndex: parseInt(tx.transactionIndex),
      isError: tx.isError === '1',
      txreceipt_status: tx.txreceipt_status,
      chain: chain
    };
  }

  /**
   * Format token transfer data
   */
  formatTokenTransfer(tx, chain) {
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      contractAddress: tx.contractAddress,
      tokenName: tx.tokenName,
      tokenSymbol: tx.tokenSymbol,
      tokenDecimal: parseInt(tx.tokenDecimal),
      value: tx.value,
      valueFormatted: this.formatTokenAmount(tx.value, parseInt(tx.tokenDecimal)),
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp),
      transactionIndex: parseInt(tx.transactionIndex),
      chain: chain
    };
  }

  /**
   * Format internal transaction data
   */
  formatInternalTransaction(tx, chain) {
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      valueFormatted: this.formatEthAmount(tx.value),
      gas: tx.gas,
      gasUsed: tx.gasUsed,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp),
      traceId: tx.traceId,
      isError: tx.isError === '1',
      errCode: tx.errCode,
      chain: chain
    };
  }

  /**
   * Get token information
   */
  async getTokenInfo(contractAddress, chain = 'ethereum') {
    try {
      const response = await axios.get(this.baseUrls[chain], {
        params: {
          module: 'token',
          action: 'tokeninfo',
          contractaddress: contractAddress,
          apikey: this.apiKeys[chain]
        },
        timeout: 30000
      });

      if (response.data.status === '1' && response.data.result.length > 0) {
        return response.data.result[0];
      } else {
        // Fallback to basic info
        return {
          contractAddress: contractAddress,
          tokenName: 'Unknown',
          tokenSymbol: 'UNKNOWN',
          decimals: 18
        };
      }
    } catch (error) {
      return {
        contractAddress: contractAddress,
        tokenName: 'Unknown',
        tokenSymbol: 'UNKNOWN',
        decimals: 18
      };
    }
  }

  /**
   * Format ETH amount
   */
  formatEthAmount(value) {
    const ethValue = parseFloat(value) / Math.pow(10, 18);
    return ethValue.toFixed(6);
  }

  /**
   * Format token amount
   */
  formatTokenAmount(value, decimals) {
    const tokenValue = parseFloat(value) / Math.pow(10, decimals);
    return tokenValue.toFixed(6);
  }

  /**
   * Get first seen timestamp
   */
  getFirstSeen(transactions) {
    if (transactions.length === 0) return null;
    const timestamps = transactions.map(tx => tx.timestamp);
    return Math.min(...timestamps);
  }

  /**
   * Get last seen timestamp
   */
  getLastSeen(transactions) {
    if (transactions.length === 0) return null;
    const timestamps = transactions.map(tx => tx.timestamp);
    return Math.max(...timestamps);
  }

  /**
   * Calculate total volume
   */
  calculateTotalVolume(transactions) {
    return transactions.reduce((total, tx) => {
      return total + parseFloat(tx.value);
    }, 0);
  }

  /**
   * Calculate token volume
   */
  calculateTokenVolume(transfers) {
    const tokenVolumes = {};
    
    for (const transfer of transfers) {
      const symbol = transfer.tokenSymbol;
      if (!tokenVolumes[symbol]) {
        tokenVolumes[symbol] = 0;
      }
      tokenVolumes[symbol] += parseFloat(transfer.value);
    }
    
    return tokenVolumes;
  }

  /**
   * Cache management
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  cacheData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });

    // Clean cache if too large
    if (this.cache.size > 1000) {
      this.cleanCache();
    }
  }

  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get API rate limit status
   */
  async getRateLimitStatus(chain = 'ethereum') {
    try {
      const response = await axios.get(this.baseUrls[chain], {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: this.apiKeys[chain]
        },
        timeout: 10000
      });

      return {
        chain: chain,
        status: response.status,
        rateLimitRemaining: response.headers['x-ratelimit-remaining'] || 'unknown',
        apiKey: this.apiKeys[chain].substring(0, 8) + '...'
      };
    } catch (error) {
      return {
        chain: chain,
        status: 'error',
        error: error.message,
        apiKey: this.apiKeys[chain].substring(0, 8) + '...'
      };
    }
  }

  /**
   * Get wallet info (balance, last activity, entity type)
   */
  async getWalletInfo(address, chain = 'ethereum') {
    try {
      // Get balance
      const balanceResult = await this.getBalanceFromRpc(address, chain);
      const balance = balanceResult.balanceFormatted || '0';

      // Get last activity (from transactions)
      let lastActivity = null;
      let riskScore = 0;
      let entityType = 'individual';
      try {
        const txs = await this.getWalletTransactions(address, chain, 1, 10);
        if (txs.transactions && txs.transactions.length > 0) {
          // Use the most recent transaction timestamp
          lastActivity = new Date(txs.transactions[0].timestamp * 1000).toISOString();
          // Optionally, set riskScore based on tx count or other logic
          riskScore = Math.min(100, txs.transactions.length * 2);
        }
      } catch (err) {
        // Ignore errors, just leave lastActivity null
      }

      return {
        balance,
        lastActivity,
        riskScore,
        entityType,
      };
    } catch (error) {
      console.error('❌ Error in getWalletInfo:', error.message);
      return {
        balance: '0',
        lastActivity: null,
        riskScore: 0,
        entityType: 'individual',
      };
    }
  }

  /**
   * Get Bitcoin transaction data
   * GET https://blockstream.info/api/address/{address}/txs
   */
  async getBitcoinTransactions(address, page = 1, offset = 100) {
    try {
      console.log(`📡 Fetching Bitcoin transactions for ${address}...`);
      
      const cacheKey = `btc_tx_${address}_${page}_${offset}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrls.bitcoin}/address/${address}/txs`, {
        params: {
          start_index: (page - 1) * offset,
          count: offset
        },
        timeout: 30000
      });

      if (response.data) {
        const transactions = response.data.map(tx => this.formatBitcoinTransaction(tx, address));
        
        const result = {
          address: address,
          chain: 'bitcoin',
          transactions: transactions,
          total: response.data.length,
          page: page,
          offset: offset
        };

        this.cacheData(cacheKey, result);
        console.log(`✅ Fetched ${transactions.length} Bitcoin transactions for ${address}`);
        return result;
      } else {
        throw new Error('No data received from Bitcoin API');
      }
    } catch (error) {
      console.error(`❌ Error fetching Bitcoin transactions for ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Get Bitcoin transaction details
   * GET https://blockstream.info/api/tx/{txid}
   */
  async getBitcoinTransaction(txid) {
    try {
      console.log(`📡 Fetching Bitcoin transaction: ${txid}`);
      
      const cacheKey = `btc_tx_detail_${txid}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrls.bitcoin}/tx/${txid}`, {
        timeout: 30000
      });

      if (response.data) {
        const result = this.formatBitcoinTransactionDetail(response.data);
        this.cacheData(cacheKey, result);
        console.log(`✅ Fetched Bitcoin transaction: ${txid}`);
        return result;
      } else {
        throw new Error('No data received from Bitcoin API');
      }
    } catch (error) {
      console.error(`❌ Error fetching Bitcoin transaction ${txid}:`, error.message);
      throw error;
    }
  }

  /**
   * Get Bitcoin address balance
   * GET https://blockstream.info/api/address/{address}
   */
  async getBitcoinBalance(address) {
    try {
      console.log(`📡 Fetching Bitcoin balance for ${address}...`);
      
      const cacheKey = `btc_balance_${address}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrls.bitcoin}/address/${address}`, {
        timeout: 30000
      });

      if (response.data) {
        const result = {
          address: address,
          chain: 'bitcoin',
          balance: response.data.chain_stats.funded_txo_sum - response.data.chain_stats.spent_txo_sum,
          balanceFormatted: ((response.data.chain_stats.funded_txo_sum - response.data.chain_stats.spent_txo_sum) / 100000000).toFixed(8), // Convert satoshis to BTC
          totalReceived: response.data.chain_stats.funded_txo_sum / 100000000,
          totalSent: response.data.chain_stats.spent_txo_sum / 100000000,
          txCount: response.data.chain_stats.tx_count,
          timestamp: new Date().toISOString()
        };

        this.cacheData(cacheKey, result);
        console.log(`✅ Retrieved Bitcoin balance: ${result.balanceFormatted} BTC`);
        return result;
      } else {
        throw new Error('No data received from Bitcoin API');
      }
    } catch (error) {
      console.error(`❌ Error fetching Bitcoin balance for ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Format Bitcoin transaction data
   */
  formatBitcoinTransaction(tx, address) {
    // Find inputs and outputs for this address
    const inputs = tx.vin.filter(vin => vin.prevout && vin.prevout.scriptpubkey_address === address);
    const outputs = tx.vout.filter(vout => vout.scriptpubkey_address === address);
    
    // Calculate net amount for this address
    const inputAmount = inputs.reduce((sum, vin) => sum + (vin.prevout?.value || 0), 0);
    const outputAmount = outputs.reduce((sum, vout) => sum + vout.value, 0);
    const netAmount = outputAmount - inputAmount;

    return {
      hash: tx.txid,
      from: inputs.length > 0 ? address : 'unknown',
      to: outputs.length > 0 ? address : 'unknown',
      value: Math.abs(netAmount),
      valueFormatted: (Math.abs(netAmount) / 100000000).toFixed(8), // Convert satoshis to BTC
      gas: 0, // Bitcoin doesn't use gas
      gasPrice: 0,
      gasUsed: 0,
      blockNumber: tx.status.block_height,
      timestamp: tx.status.block_time,
      nonce: 0, // Bitcoin doesn't use nonce
      transactionIndex: tx.status.block_height,
      isError: false,
      txreceipt_status: tx.status.confirmed ? '1' : '0',
      chain: 'bitcoin',
      type: netAmount > 0 ? 'RECEIVED' : netAmount < 0 ? 'SENT' : 'INTERNAL'
    };
  }

  /**
   * Format Bitcoin transaction detail
   */
  formatBitcoinTransactionDetail(tx) {
    return {
      hash: tx.txid,
      chain: 'bitcoin',
      blockHeight: tx.status.block_height,
      blockTime: tx.status.block_time,
      confirmed: tx.status.confirmed,
      inputs: tx.vin.map(vin => ({
        address: vin.prevout?.scriptpubkey_address,
        value: vin.prevout?.value || 0,
        valueFormatted: ((vin.prevout?.value || 0) / 100000000).toFixed(8)
      })),
      outputs: tx.vout.map(vout => ({
        address: vout.scriptpubkey_address,
        value: vout.value,
        valueFormatted: (vout.value / 100000000).toFixed(8),
        scriptpubkey: vout.scriptpubkey
      })),
      totalInput: tx.vin.reduce((sum, vin) => sum + (vin.prevout?.value || 0), 0),
      totalOutput: tx.vout.reduce((sum, vout) => sum + vout.value, 0),
      fee: tx.vin.reduce((sum, vin) => sum + (vin.prevout?.value || 0), 0) - tx.vout.reduce((sum, vout) => sum + vout.value, 0),
      size: tx.size,
      weight: tx.weight
    };
  }
}

module.exports = BlockchainDataService; 