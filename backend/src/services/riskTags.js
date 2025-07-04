const bridgeList = require('./bridgeList');

// Enhanced risky addresses and patterns
const riskyAddresses = [
  '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch
  '0x000000000000000000000000000000000000dead', // Burn
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
  '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3 Router
  '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9', // Aave Lending Pool
];

// Known mixer/tumbler addresses
const mixerAddresses = [
  '0x722122df12d4e14e13ac3b6895a86e84145b6967', // Tornado Cash
  '0xdd4c48c0b24039969fc16d1cdf626eab821d3384', // Tornado Cash
  '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', // Tornado Cash
  '0x722122df12d4e14e13ac3b6895a86e84145b6967', // Tornado Cash
];

// DEX addresses
const dexAddresses = [
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2
  '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3
  '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x Protocol
];

// Suspicious patterns in transaction data
const suspiciousPatterns = [
  '0x0000000000000000000000000000000000000000', // Zero address
  '0x0000000000000000000000000000000000000001', // Another zero-like
];

function getRiskTags(tx, receipt) {
  const tags = [];
  const from = (tx.from || '').toLowerCase();
  const to = (tx.to || '').toLowerCase();
  
  // Bridge detection
  if (bridgeList.includes(to)) {
    tags.push('BRIDGE');
  }
  
  // Risky address detection
  if (riskyAddresses.includes(to) || riskyAddresses.includes(from)) {
    tags.push('RISKY_ADDRESS');
  }
  
  // Mixer detection
  if (mixerAddresses.includes(to) || mixerAddresses.includes(from)) {
    tags.push('MIXER');
  }
  
  // DEX interaction
  if (dexAddresses.includes(to) || dexAddresses.includes(from)) {
    tags.push('DEX_INTERACTION');
  }
  
  // Contract interaction
  if (tx.input && tx.input.length > 10) {
    tags.push('CONTRACT_INTERACTION');
  }
  
  // Zero value transactions
  if (tx.value === '0x0' || tx.value === '0') {
    tags.push('ZERO_VALUE');
  }
  
  // High gas usage (potential complex contract interaction)
  if (receipt && receipt.gasUsed && parseInt(receipt.gasUsed, 16) > 100000) {
    tags.push('HIGH_GAS_USAGE');
  }
  
  // Suspicious patterns
  if (suspiciousPatterns.includes(to) || suspiciousPatterns.includes(from)) {
    tags.push('SUSPICIOUS_PATTERN');
  }
  
  // Self-transaction
  if (from === to) {
    tags.push('SELF_TRANSACTION');
  }
  
  // Multiple contract creations (if receipt has contractAddress)
  if (receipt && receipt.contractAddress) {
    tags.push('CONTRACT_CREATION');
  }
  
  return tags;
}

function calculateRiskScore(tags, tx, receipt) {
  let score = 0;
  
  // Base risk from tags
  score += tags.length * 10;
  
  // High risk tags
  if (tags.includes('MIXER')) score += 50;
  if (tags.includes('BRIDGE')) score += 30;
  if (tags.includes('SUSPICIOUS_PATTERN')) score += 40;
  
  // Medium risk tags
  if (tags.includes('DEX_INTERACTION')) score += 20;
  if (tags.includes('CONTRACT_INTERACTION')) score += 15;
  if (tags.includes('HIGH_GAS_USAGE')) score += 25;
  
  // Value-based risk
  if (tx.value && tx.value !== '0x0') {
    const value = parseInt(tx.value, 16) / 1e18;
    if (value > 10) score += 20; // High value
    if (value > 100) score += 30; // Very high value
  }
  
  return Math.min(score, 100); // Cap at 100
}

module.exports = { getRiskTags, calculateRiskScore }; 