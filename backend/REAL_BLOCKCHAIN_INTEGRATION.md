# Real Blockchain Data Integration

## Overview

This system integrates real blockchain data from Ethereum and BSC networks using Etherscan and BSCscan APIs, replacing mock data with live transaction history, token transfers, and contract information.

## 🎯 Key Features

### 1. Real Wallet Transaction History
- **Endpoint**: `GET /api/wallets/:address/transactions`
- **API**: `https://api.etherscan.io/api?module=account&action=txlist&address=0x...&apikey=7C1...`
- **Features**:
  - ✅ All ETH or BNB transfers (to/from)
  - ✅ Full tx metadata (hash, block, timestamp, gas, status)
  - ✅ Used in `/wallets/:address/transactions`
  - ✅ Real-time blockchain data

### 2. ERC-20 Token Transfers
- **Endpoint**: `GET /api/wallets/:address/token-holdings`
- **API**: `https://api.etherscan.io/api?module=account&action=tokentx&address=0x...&apikey=7C1...`
- **Features**:
  - ✅ Token sent/received (USDT, USDC, etc.)
  - ✅ Track laundering via stablecoins
  - ✅ Used for token-level flow analysis
  - ✅ Real token transfer data

### 3. Smart Contract Verification
- **Endpoint**: `GET /api/wallets/:address/contract-abi`
- **API**: `https://api.etherscan.io/api?module=contract&action=getabi&address=0x...&apikey=7C1...`
- **Features**:
  - ✅ Pull ABI of any contract (e.g., bridge router, mixer)
  - ✅ Needed for decoding on-chain events
  - ✅ Helps create real bridgeWatcher.js
  - ✅ Contract function and event analysis

### 4. Internal Transaction Tracing
- **Endpoint**: `GET /api/wallets/:address/internal-transactions`
- **API**: `https://api.etherscan.io/api?module=account&action=txlistinternal&address=0x...&apikey=7C1...`
- **Features**:
  - ✅ Track contract-to-contract flows
  - ✅ Important for tracing mixers & laundering techniques
  - ✅ Internal transaction analysis

### 5. Token Balance & Supply Info
- **Endpoint**: `GET /api/wallets/:address/token-holdings`
- **API**: `https://api.etherscan.io/api?module=account&action=tokenbalance...`
- **Features**:
  - ✅ Know if wallet holds large/stable tokens
  - ✅ Tag "high net worth" wallets or whale activity
  - ✅ Real-time balance checking

## 🏗️ Architecture

### Core Components

#### 1. BlockchainDataService
```javascript
// Main service for all blockchain data operations
const blockchainService = new BlockchainDataService();

// Fetch real transactions
const transactions = await blockchainService.getWalletTransactions(address, 'ethereum');

// Get token transfers
const tokenTransfers = await blockchainService.getTokenTransfers(address, 'ethereum');

// Get contract ABI
const abi = await blockchainService.getContractABI(contractAddress, 'ethereum');
```

#### 2. Enhanced Wallet Controller
```javascript
// Real blockchain data integration
const getWalletTransactions = async (req, res) => {
  const { address } = req.params;
  const { chain = 'ethereum' } = req.query;
  
  // Get real blockchain data
  const blockchainData = await blockchainService.getWalletTransactions(address, chain);
  const tokenData = await blockchainService.getTokenTransfers(address, chain);
  
  // Return combined real data
  res.json({
    success: true,
    data: {
      transactions: blockchainData.transactions,
      tokenTransfers: tokenData.transfers,
      summary: { /* real statistics */ }
    }
  });
};
```

#### 3. Comprehensive Analysis
```javascript
// Full wallet analysis with risk scoring
const analysis = await blockchainService.getWalletAnalysis(address, 'ethereum');

// Returns:
{
  address: "0x...",
  chain: "ethereum",
  summary: {
    totalTransactions: 1500,
    totalTokenTransfers: 800,
    firstSeen: 1609459200,
    lastSeen: 1704067200,
    totalVolume: "5000000000000000000000"
  },
  riskIndicators: {
    riskScore: 75,
    highValueTransfers: 5,
    frequentTransfers: 12,
    mixerInteractions: 2
  },
  tokenHoldings: [/* real token balances */],
  transactionHistory: [/* recent transactions */]
}
```

## 📊 API Endpoints

### Wallet Analysis
```http
GET /api/wallets/:address/analysis?chain=ethereum
```
**Response**:
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "chain": "ethereum",
    "summary": {
      "totalTransactions": 1500,
      "totalTokenTransfers": 800,
      "totalInternalTransactions": 200,
      "firstSeen": 1609459200,
      "lastSeen": 1704067200,
      "totalVolume": "5000000000000000000000",
      "tokenVolume": {
        "USDT": "1000000000000000000000000",
        "USDC": "500000000000000000000000"
      }
    },
    "riskIndicators": {
      "riskScore": 75,
      "highValueTransfers": 5,
      "frequentTransfers": 12,
      "mixerInteractions": 2,
      "suspiciousPatterns": 3
    },
    "tokenHoldings": [
      {
        "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "balance": "1000000000000000000000000",
        "balanceFormatted": "1000000.000000",
        "tokenInfo": {
          "tokenName": "Tether USD",
          "tokenSymbol": "USDT",
          "decimals": 6
        }
      }
    ]
  }
}
```

### Risk Assessment
```http
GET /api/wallets/:address/risk-assessment?chain=ethereum
```
**Response**:
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "chain": "ethereum",
    "riskScore": 75,
    "riskLevel": "HIGH",
    "indicators": {
      "highValueTransfers": 5,
      "frequentTransfers": 12,
      "mixerInteractions": 2
    },
    "recommendations": [
      {
        "type": "MIXER_INTERACTION",
        "severity": "CRITICAL",
        "message": "Wallet has interacted with known mixers 2 times. High laundering risk."
      }
    ],
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  }
}
```

### Token Holdings
```http
GET /api/wallets/:address/token-holdings?chain=ethereum
```
**Response**:
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "chain": "ethereum",
    "holdings": [
      {
        "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "balance": "1000000000000000000000000",
        "balanceFormatted": "1000000.000000",
        "tokenInfo": {
          "tokenName": "Tether USD",
          "tokenSymbol": "USDT",
          "decimals": 6
        }
      }
    ],
    "totalTokens": 1,
    "totalValue": 1000000
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Etherscan API Key
ETHERSCAN_API_KEY=7C1...

# BSCscan API Key (optional, can use same key)
BSCSCAN_API_KEY=7C1...

# Cache timeout (5 minutes default)
BLOCKCHAIN_CACHE_TIMEOUT=300000
```

### API Rate Limits
- **Etherscan**: 5 calls/second, 100,000 calls/day
- **BSCscan**: 5 calls/second, 100,000 calls/day
- **Caching**: 5-minute cache to reduce API calls

## 🧪 Testing

### Run Full Test Suite
```bash
cd backend
node test-real-blockchain.js
```

### Test Specific Function
```bash
node test-real-blockchain.js --specific
```

### Test Output Example
```
🔍 Testing Real Blockchain Data Integration...
==========================================

1️⃣ Testing API Status...
✅ API Status: {
  "chain": "ethereum",
  "status": 200,
  "rateLimitRemaining": "99995"
}

2️⃣ Testing Wallet Transactions...
📡 Fetching transactions for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6...
✅ Retrieved 1500 transactions
📊 Sample transaction: {
  "hash": "0x...",
  "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "to": "0x...",
  "value": "1000000000000000000",
  "valueFormatted": "1.000000",
  "blockNumber": 18500000,
  "timestamp": 1704067200
}

✅ Real Blockchain Data Integration Test Completed!
🎯 All API endpoints are working with real blockchain data
📊 Your AML system now uses live Ethereum/BSC data instead of mock data
```

## 🚀 Integration Benefits

### Before (Mock Data)
```javascript
// Mock transaction data
const mockTransactions = [
  {
    hash: "0x" + Math.random().toString(16).substr(2, 64),
    from: address,
    to: "0x" + Math.random().toString(16).substr(2, 40),
    amount: Math.random() * 100,
    currency: "ETH",
    timestamp: new Date().toISOString(),
    // ... fake data
  }
];
```

### After (Real Blockchain Data)
```javascript
// Real blockchain data
const realTransactions = await blockchainService.getWalletTransactions(address, 'ethereum');
// Returns actual transaction history with:
// - Real transaction hashes
// - Actual amounts and addresses
// - Real timestamps and block numbers
// - Gas usage and transaction status
// - Token transfers and internal transactions
```

## 🎯 Final Power

Using this API key integration, your AML system now:

1. **Replaces mock data** with real-time, real-chain data from Ethereum and BSC
2. **Upgrades from simulation** to real surveillance & investigation system
3. **Provides comprehensive analysis** including:
   - Real transaction history
   - Token transfer tracking
   - Contract interaction analysis
   - Risk scoring based on actual behavior
   - Internal transaction tracing
   - Token balance monitoring

4. **Enables advanced features**:
   - Cross-chain transaction correlation
   - Real-time laundering detection
   - Whale activity monitoring
   - Contract interaction analysis
   - Risk-based alerting

## 🔒 Security Considerations

1. **API Key Protection**: Store API keys in environment variables
2. **Rate Limiting**: Implement caching to respect API limits
3. **Data Validation**: Validate all blockchain addresses
4. **Error Handling**: Graceful handling of API failures
5. **Audit Logging**: Log all blockchain data requests

## 📈 Performance Optimization

1. **Caching**: 5-minute cache for repeated requests
2. **Pagination**: Support for large transaction histories
3. **Parallel Requests**: Concurrent API calls where possible
4. **Error Recovery**: Retry logic for failed requests
5. **Rate Limit Management**: Respect API rate limits

This integration transforms your AML system from a simulation tool into a production-ready blockchain surveillance system capable of real-time monitoring and investigation of cryptocurrency transactions across multiple chains. 
 
 