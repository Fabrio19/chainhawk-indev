# Bridge Monitoring System

A production-ready cross-chain bridge monitoring system that tracks transactions across multiple bridge protocols and saves data to PostgreSQL for AML compliance.

## 🌉 Supported Bridge Protocols

- **Stargate** (LayerZero) - Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom
- **Celer cBridge** - Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom
- **Wormhole** - Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom, Solana
- **Synapse** - Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom
- **Hop Protocol** - Ethereum, Polygon, Arbitrum, Optimism
- **deBridge** - Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche
- **Across Protocol** - Ethereum, Polygon, Arbitrum, Optimism
- **Orbiter Finance** - Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, zkSync, Linea, Base
- **xBridge** - Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the backend directory with your RPC URLs:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/chainhawk"

# RPC URLs
ETHEREUM_RPC_URL="https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY"
BSC_RPC_URL="https://bsc-dataseed.binance.org/"
POLYGON_RPC_URL="https://polygon-rpc.com/"
ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"
OPTIMISM_RPC_URL="https://mainnet.optimism.io"
AVALANCHE_RPC_URL="https://api.avax.network/ext/bc/C/rpc"
FANTOM_RPC_URL="https://rpc.ftm.tools/"
ZKSYNC_RPC_URL="https://mainnet.era.zksync.io"
LINEA_RPC_URL="https://rpc.linea.build"
BASE_RPC_URL="https://mainnet.base.org"
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
```

### 2. Database Setup

Ensure your PostgreSQL database is running and the schema is migrated:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 3. Start Bridge Monitoring

```bash
# Start all bridge watchers
node main.js

# Or run the test script
node test-bridge-monitoring.js
```

## 📊 Features

### Real-time Event Monitoring
- **Transaction Detection**: Monitors cross-chain bridge events in real-time
- **Event Logging**: Logs tx hash, source/destination chains, amounts, tokens, and wallet addresses
- **Signature Validation**: Validates bridge signatures when available
- **Error Handling**: Robust error handling with automatic reconnection

### Database Integration
- **PostgreSQL Storage**: All bridge transactions saved to `bridge_transactions` table
- **Structured Data**: Normalized data with proper relationships
- **Metadata Storage**: Bridge-specific metadata stored as JSON
- **Risk Scoring**: Support for risk scoring and flagging

### Production Features
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals
- **Reconnection Logic**: Automatic reconnection on connection failures
- **Status Monitoring**: Real-time status of all bridge watchers
- **CLI Logging**: Clear console output with emojis and status indicators

## 🏗️ Architecture

### Main Components

1. **main.js** - Orchestrates all bridge watchers
2. **bridges/** - Individual bridge listener modules
3. **Database** - PostgreSQL with Prisma ORM
4. **Event Callbacks** - Unified event processing

### Bridge Listener Structure

Each bridge listener (`stargate.js`, `wormhole.js`, etc.) follows this pattern:

```javascript
class BridgeListener {
  constructor(chainName, rpcUrl)
  async initialize()
  async handleEvent(eventName, args, event)
  setupEventListeners()
  async startMonitoring(onEventCallback)
  async handleReconnect()
  async stopMonitoring()
  getStatus()
}

async function startBridgeWatcher(chainName, rpcUrl, onEventCallback)
```

## 📈 Event Data Structure

Each bridge event is processed and saved with this structure:

```javascript
{
  protocol: 'STARGATE',
  sourceChain: 'ethereum',
  destinationChain: 'bsc',
  sourceAddress: '0x...',
  destinationAddress: '0x...',
  tokenAddress: '0x...',
  amount: '100.5',
  txHash: '0x...',
  blockNumber: 12345678,
  eventType: 'SendMsg',
  timestamp: '2024-01-01T00:00:00Z',
  metadata: {
    nonce: '123',
    amountSD: '100.5',
    // Bridge-specific data
  }
}
```

## 🔧 Configuration

### Bridge Configuration

Modify `BRIDGE_CONFIG` in `main.js` to customize which chains to monitor:

```javascript
const BRIDGE_CONFIG = {
  STARGATE: {
    chains: ['ethereum', 'bsc', 'polygon'], // Customize chains
    startFunction: startStargate
  },
  // ... other bridges
};
```

### RPC Configuration

Add or modify RPC URLs in the `RPC_URLS` object:

```javascript
const RPC_URLS = {
  ethereum: process.env.ETHEREUM_RPC_URL,
  // Add new chains here
  newchain: process.env.NEWCHAIN_RPC_URL
};
```

## 🧪 Testing

### Test Individual Bridge

```bash
# Test a specific bridge
node -e "
const { startBridgeWatcher } = require('./src/services/bridges/stargate');
startBridgeWatcher('ethereum', process.env.ETHEREUM_RPC_URL, (data) => {
  console.log('Event:', data);
});
"
```

### Test All Bridges

```bash
# Run the comprehensive test
node test-bridge-monitoring.js
```

### Expected Output

```
🌉 Starting Bridge Monitoring System...
==========================================

⚠️  Missing RPC URLs for: solana
   Add them to your .env file:
   SOLANA_RPC_URL=https://your-rpc-url

🚀 Starting STARGATE on ethereum...
[✔] STARGATE on ethereum started
🚀 Starting STARGATE on bsc...
[✔] STARGATE on bsc started
...

==========================================
📊 Bridge Monitoring Summary:
✅ Successfully started: 45 watchers
❌ Failed to start: 3 watchers
🎯 Total active watchers: 45

🚀 Bridge monitoring system is running!
Press Ctrl+C to stop all watchers.
```

## 📝 Logging

### Event Logs

When a bridge event is detected:

```
🌉 Bridge Event Detected:
   Protocol: STARGATE
   TX Hash: 0x1234...
   From: ethereum -> To: bsc
   Amount: 100.5 tokens
   Token: 0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8
   Wallet: 0x1234...
💾 Saved bridge transaction: uuid-1234...
```

### Status Logs

```
📊 Active watchers: 45
   - STARGATE on ethereum: ✅ Active
   - STARGATE on bsc: ✅ Active
   - WORMHOLE on ethereum: ✅ Active
   - CELER_CBRIDGE on polygon: ❌ Inactive
```

## 🔒 Security Features

- **Signature Validation**: Validates bridge signatures when available
- **Error Handling**: Robust error handling prevents crashes
- **Rate Limiting**: Built-in rate limiting for RPC calls
- **Connection Security**: Secure RPC connections with proper error handling

## 🚨 Troubleshooting

### Common Issues

1. **Missing RPC URLs**
   ```
   ⚠️  Missing RPC URLs for: ethereum, bsc
   ```
   Solution: Add the missing RPC URLs to your `.env` file

2. **Database Connection Errors**
   ```
   ❌ Error saving bridge transaction: connect ECONNREFUSED
   ```
   Solution: Ensure PostgreSQL is running and DATABASE_URL is correct

3. **Contract Address Errors**
   ```
   ❌ No contract address configured for newchain
   ```
   Solution: Add contract addresses for new chains in the bridge listener

4. **RPC Rate Limiting**
   ```
   ❌ RPC rate limit exceeded
   ```
   Solution: Use premium RPC providers or implement rate limiting

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=true node main.js
```

## 📚 API Reference

### Main Functions

```javascript
// Start all bridge watchers
await watchAllBridges()

// Stop all bridge watchers
await stopAllBridges()

// Get status of all watchers
const status = getBridgeStatus()

// Start a specific bridge watcher
await startBridgeWatcher('STARGATE', 'ethereum', rpcUrl)
```

### Event Callback

```javascript
function onBridgeEvent(bridgeData) {
  // bridgeData contains:
  // - protocol, sourceChain, destinationChain
  // - sourceAddress, destinationAddress, tokenAddress
  // - amount, txHash, blockNumber, eventType
  // - timestamp, metadata
}
```

## 🤝 Contributing

1. Add new bridge protocols by creating a new file in `bridges/`
2. Follow the existing bridge listener pattern
3. Add contract addresses and ABIs for the new protocol
4. Update `BRIDGE_CONFIG` in `main.js`
5. Test thoroughly with the test script

## 📄 License

This project is part of the ChainHawk crypto compliance platform. 