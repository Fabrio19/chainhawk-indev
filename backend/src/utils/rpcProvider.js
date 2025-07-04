const { ethers } = require("ethers");

// RPC URLs with fallbacks
const RPC_CONFIG = {
  ethereum: {
    primary: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d',
    fallbacks: [
      'https://eth-mainnet.g.alchemy.com/v2/demo',
      'https://rpc.ankr.com/eth',
      'https://cloudflare-eth.com'
    ]
  },
  bsc: {
    primary: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    fallbacks: [
      'https://bsc-dataseed1.defibit.io',
      'https://bsc-dataseed1.ninicoin.io',
      'https://bsc.nodereal.io'
    ]
  },
  polygon: {
    primary: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    fallbacks: [
      'https://rpc-mainnet.matic.network',
      'https://rpc-mainnet.maticvigil.com'
    ]
  },
  arbitrum: {
    primary: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    fallbacks: [
      'https://arbitrum-mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d',
      'https://rpc.ankr.com/arbitrum'
    ]
  },
  optimism: {
    primary: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    fallbacks: [
      'https://optimism-mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d',
      'https://rpc.ankr.com/optimism'
    ]
  },
  avalanche: {
    primary: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    fallbacks: [
      'https://rpc.ankr.com/avalanche',
      'https://avalanche-mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d'
    ]
  },
  fantom: {
    primary: process.env.FANTOM_RPC_URL || 'https://rpcapi.fantom.network',
    fallbacks: [
      'https://rpc.ankr.com/fantom',
      'https://rpc.ftm.tools'
    ]
  },
  zksync: {
    primary: process.env.ZKSYNC_RPC_URL || 'https://mainnet.era.zksync.io',
    fallbacks: [
      'https://zksync.drpc.org'
    ]
  },
  linea: {
    primary: process.env.LINEA_RPC_URL || 'https://rpc.linea.build',
    fallbacks: [
      'https://linea-mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d'
    ]
  },
  base: {
    primary: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    fallbacks: [
      'https://base-mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d',
      'https://rpc.ankr.com/base'
    ]
  }
};

// Provider instances
const providers = {};

/**
 * Create provider with fallback support
 */
function createProvider(chain) {
  const config = RPC_CONFIG[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  const urls = [config.primary, ...config.fallbacks];
  
  // Try each URL until one works
  for (const url of urls) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(url);
      console.log(`✅ Connected to ${chain} via ${url}`);
      return provider;
    } catch (error) {
      console.warn(`⚠️ Failed to connect to ${chain} via ${url}: ${error.message}`);
      continue;
    }
  }
  
  throw new Error(`Failed to connect to any ${chain} RPC endpoint`);
}

/**
 * Get provider for specific chain
 */
function getProvider(chain) {
  const chainKey = chain.toLowerCase();
  
  if (!providers[chainKey]) {
    providers[chainKey] = createProvider(chainKey);
  }
  
  return providers[chainKey];
}

/**
 * Get provider by chain with validation
 */
function getProviderByChain(chain) {
  const supportedChains = Object.keys(RPC_CONFIG);
  const chainKey = chain.toLowerCase();
  
  if (!supportedChains.includes(chainKey)) {
    throw new Error(`Unsupported chain: ${chain}. Supported chains: ${supportedChains.join(', ')}`);
  }
  
  return getProvider(chainKey);
}

/**
 * Test all provider connections
 */
async function testProviders() {
  const results = {};
  
  for (const chain of Object.keys(RPC_CONFIG)) {
    try {
      const provider = getProvider(chain);
      const blockNumber = await provider.getBlockNumber();
      results[chain] = {
        status: 'connected',
        blockNumber: blockNumber,
        url: provider.connection.url
      };
    } catch (error) {
      results[chain] = {
        status: 'failed',
        error: error.message
      };
    }
  }
  
  return results;
}

/**
 * Get transaction by hash
 */
async function getTransaction(hash, chain = 'ethereum') {
  const provider = getProviderByChain(chain);
  return await provider.getTransaction(hash);
}

/**
 * Get transaction receipt
 */
async function getTransactionReceipt(hash, chain = 'ethereum') {
  const provider = getProviderByChain(chain);
  return await provider.getTransactionReceipt(hash);
}

/**
 * Get block by number
 */
async function getBlock(blockNumber, chain = 'ethereum') {
  const provider = getProviderByChain(chain);
  return await provider.getBlock(blockNumber);
}

/**
 * Get latest block number
 */
async function getBlockNumber(chain = 'ethereum') {
  const provider = getProviderByChain(chain);
  return await provider.getBlockNumber();
}

/**
 * Get balance for address
 */
async function getBalance(address, chain = 'ethereum') {
  const provider = getProviderByChain(chain);
  return await provider.getBalance(address);
}

/**
 * Get code for contract address
 */
async function getCode(address, chain = 'ethereum') {
  const provider = getProviderByChain(chain);
  return await provider.getCode(address);
}

/**
 * Get gas price
 */
async function getGasPrice(chain = 'ethereum') {
  const provider = getProviderByChain(chain);
  return await provider.getGasPrice();
}

/**
 * Get network info
 */
async function getNetwork(chain = 'ethereum') {
  const provider = getProviderByChain(chain);
  return await provider.getNetwork();
}

/**
 * Parse transaction data with ABI
 */
function parseTransactionData(abi, data) {
  try {
    const iface = new ethers.utils.Interface(abi);
    return iface.parseTransaction({ data });
  } catch (error) {
    return null;
  }
}

/**
 * Decode event logs with ABI
 */
function parseEventLogs(abi, logs) {
  try {
    const iface = new ethers.utils.Interface(abi);
    return logs.map(log => {
      try {
        return iface.parseLog(log);
      } catch (error) {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    return [];
  }
}

/**
 * Format address (checksum)
 */
function formatAddress(address, chain = 'ethereum') {
  try {
    return ethers.utils.getAddress(address);
  } catch (error) {
    return address;
  }
}

/**
 * Validate address format
 */
function isValidAddress(address) {
  return ethers.utils.isAddress(address);
}

/**
 * Get supported chains
 */
function getSupportedChains() {
  return Object.keys(RPC_CONFIG);
}

/**
 * Get RPC configuration
 */
function getRpcConfig() {
  return RPC_CONFIG;
}

module.exports = {
  // Core provider functions
  getProvider,
  getProviderByChain,
  testProviders,
  
  // Transaction functions
  getTransaction,
  getTransactionReceipt,
  getBlock,
  getBlockNumber,
  
  // Account functions
  getBalance,
  getCode,
  
  // Network functions
  getGasPrice,
  getNetwork,
  
  // Utility functions
  parseTransactionData,
  parseEventLogs,
  formatAddress,
  isValidAddress,
  getSupportedChains,
  getRpcConfig,
  
  // Direct provider access (for advanced use)
  ethereumProvider: () => getProvider('ethereum'),
  bscProvider: () => getProvider('bsc'),
  polygonProvider: () => getProvider('polygon')
}; 