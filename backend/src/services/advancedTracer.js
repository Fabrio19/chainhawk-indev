const { ChainProvider } = require('./chainProviders');
const { getRiskTags, calculateRiskScore } = require('./riskTags');
const { Cache } = require('./cache');
const bridgeList = require('./bridgeList');

function isBridgeAddress(address) {
  return bridgeList.includes((address || '').toLowerCase());
}

async function traceAdvanced(
  txHash,
  options = { maxDepth: 10, chain: 'ethereum' },
  visitedTxHashes = new Set(),
  visitedAddresses = new Set(),
  cache = new Cache(),
  direction = 'out',
) {
  const flat = [];
  const tree = await traceNode(
    txHash,
    0,
    options,
    visitedTxHashes,
    visitedAddresses,
    flat,
    cache,
    direction,
  );
  
  // Calculate overall risk metrics
  const riskMetrics = calculateOverallRisk(flat);
  
  return { 
    tree, 
    flat,
    riskMetrics,
    summary: {
      totalTransactions: flat.length,
      visitedAddresses: visitedAddresses.size,
      maxDepth: Math.max(...flat.map(tx => tx.depth || 0)),
      chains: [...new Set(flat.map(tx => tx.chain))],
      averageRiskLevel: flat.reduce((sum, tx) => sum + tx.riskLevel, 0) / flat.length || 0
    }
  };
}

async function traceNode(
  txHash,
  depth,
  options,
  visitedTxHashes,
  visitedAddresses,
  flat,
  cache,
  direction,
) {
  if (depth > options.maxDepth || visitedTxHashes.has(txHash)) {
    return null;
  }
  visitedTxHashes.add(txHash);

  try {
    const provider = new ChainProvider(options.chain);
    
    // Get tx details and receipt (with caching)
    const tx = await cache.getOrSet(`tx:${options.chain}:${txHash}`, () => provider.getTxDetails(txHash));
    const receipt = await cache.getOrSet(`receipt:${options.chain}:${txHash}`, () => provider.getTxReceipt(txHash));
    
    if (!tx) return null;

    // Risk tags and scoring
    const riskTags = getRiskTags(tx, receipt);
    const riskLevel = calculateRiskScore(riskTags, tx, receipt);
    const isBridge = isBridgeAddress(tx.to);

    // Get token transfers (with caching)
    const address = tx.to || tx.from;
    const blockNumberInt = tx.blockNumber ? parseInt(tx.blockNumber, 16) : null;
    const erc20Transfers = await cache.getOrSet(`erc20:${options.chain}:${address}:${blockNumberInt}`, () => provider.getERC20Transfers(address, 20, blockNumberInt));
    const erc721Transfers = await cache.getOrSet(`erc721:${options.chain}:${address}:${blockNumberInt}`, () => provider.getERC721Transfers(address, 20, blockNumberInt));

    // Build FlatTx
    const flatTx = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      amount: provider.formatValue(tx.value),
      token: provider.config.symbol,
      chain: options.chain,
      chainName: provider.config.name,
      time: new Date().toISOString(), // Replace with real block timestamp
      riskLevel,
      riskTags,
      viaContract: !!tx.to && tx.to !== tx.from,
      isCrossChain: isBridge,
      direction,
      depth,
      contractInteraction: receipt?.to,
      bridgeName: isBridge ? 'KnownBridge' : undefined,
      erc20Transfers: erc20Transfers.slice(0, 3), // Limit for performance
      erc721Transfers: erc721Transfers.slice(0, 3), // Limit for performance
      gasUsed: receipt?.gasUsed ? parseInt(receipt.gasUsed, 16) : null,
      blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
    };
    flat.push(flatTx);

    // Recursively trace both incoming and outgoing transactions
    let children = [];
    
    // Trace outgoing transactions from 'to' address
    if (depth < options.maxDepth && tx.to && !visitedAddresses.has(tx.to)) {
      visitedAddresses.add(tx.to);
      const outgoing = await cache.getOrSet(`outgoing:${options.chain}:${tx.to}:${blockNumberInt}`, () => provider.getAddressTxs(tx.to, 15, blockNumberInt));
      
      // Process outgoing transactions with higher concurrency limit
      const concurrencyLimit = 5; // Increased from 3
      for (let i = 0; i < outgoing.length; i += concurrencyLimit) {
        const batch = outgoing.slice(i, i + concurrencyLimit);
        const batchPromises = batch
          .filter(outTx => !visitedTxHashes.has(outTx.hash) && outTx.hash !== txHash)
          .map(outTx => traceNode(
            outTx.hash,
            depth + 1,
            options,
            visitedTxHashes,
            visitedAddresses,
            flat,
            cache,
            'out',
          ));
        
        const batchResults = await Promise.all(batchPromises);
        children.push(...batchResults.filter(child => child !== null));
      }
    }

    // Also trace incoming transactions to 'from' address for better coverage
    if (depth < options.maxDepth && tx.from && !visitedAddresses.has(tx.from)) {
      visitedAddresses.add(tx.from);
      const incoming = await cache.getOrSet(`incoming:${options.chain}:${tx.from}:${blockNumberInt}`, () => provider.getAddressTxs(tx.from, 15, blockNumberInt));
      
      // Process incoming transactions
      const concurrencyLimit = 5;
      for (let i = 0; i < incoming.length; i += concurrencyLimit) {
        const batch = incoming.slice(i, i + concurrencyLimit);
        const batchPromises = batch
          .filter(inTx => !visitedTxHashes.has(inTx.hash) && inTx.hash !== txHash)
          .map(inTx => traceNode(
            inTx.hash,
            depth + 1,
            options,
            visitedTxHashes,
            visitedAddresses,
            flat,
            cache,
            'in',
          ));
        
        const batchResults = await Promise.all(batchPromises);
        children.push(...batchResults.filter(child => child !== null));
      }
    }

    return { tx: flatTx, children };
    
  } catch (error) {
    console.error(`Error tracing transaction ${txHash} at depth ${depth}:`, error.message);
    return null;
  }
}

function calculateOverallRisk(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      overallRiskLevel: 0,
      riskDistribution: {},
      highRiskTransactions: 0,
      suspiciousAddresses: new Set(),
      totalVolume: 0,
      bridgeInteractions: 0,
      mixerInteractions: 0,
      dexInteractions: 0
    };
  }

  const riskDistribution = {};
  const suspiciousAddresses = new Set();
  let highRiskTransactions = 0;
  let totalVolume = 0;
  let bridgeInteractions = 0;
  let mixerInteractions = 0;
  let dexInteractions = 0;

  transactions.forEach(tx => {
    // Risk distribution
    const riskCategory = tx.riskLevel < 30 ? 'low' : tx.riskLevel < 70 ? 'medium' : 'high';
    riskDistribution[riskCategory] = (riskDistribution[riskCategory] || 0) + 1;
    
    // High risk transactions
    if (tx.riskLevel > 70) highRiskTransactions++;
    
    // Volume
    totalVolume += parseFloat(tx.amount || 0);
    
    // Tag counts
    if (tx.riskTags.includes('BRIDGE')) bridgeInteractions++;
    if (tx.riskTags.includes('MIXER')) mixerInteractions++;
    if (tx.riskTags.includes('DEX_INTERACTION')) dexInteractions++;
    
    // Suspicious addresses
    if (tx.riskLevel > 50) {
      suspiciousAddresses.add(tx.from);
      suspiciousAddresses.add(tx.to);
    }
  });

  const overallRiskLevel = transactions.reduce((sum, tx) => sum + tx.riskLevel, 0) / transactions.length;

  return {
    overallRiskLevel: Math.round(overallRiskLevel),
    riskDistribution,
    highRiskTransactions,
    suspiciousAddresses: Array.from(suspiciousAddresses),
    totalVolume: Math.round(totalVolume * 100) / 100,
    bridgeInteractions,
    mixerInteractions,
    dexInteractions
  };
}

module.exports = { traceAdvanced }; 