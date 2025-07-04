# Modular Bridge Listener System

A comprehensive Node.js system for monitoring cross-chain bridge events across multiple blockchain networks and bridge protocols.

## 🏗️ Architecture

The system is built with a modular architecture where each bridge protocol has its own listener module:

```
backend/src/services/bridges/
├── stargate.js          # Stargate (LayerZero) bridge listener
├── cbridge.js           # Celer cBridge listener
├── wormhole.js          # Wormhole (Portal) bridge listener
├── synapse.js           # Synapse Protocol listener
├── hop.js              # Hop Protocol listener
├── debridge.js         # deBridge listener
├── across.js           # Across Protocol listener
├── orbiter.js          # Orbiter Finance listener
├── xbridge.js          # xBridge listener
└── bridgeManager.js    # Master bridge manager
```

## 🚀 Features

- **Modular Design**: One file per bridge protocol
- **Multi-Chain Support**: Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom, zkSync, Linea, Base
- **Real-Time Monitoring**: WebSocket-based event listening
- **Error Handling**: Automatic reconnection with exponential backoff
- **Database Integration**: Automatic saving to PostgreSQL
- **Unified Interface**: Master bridge manager for coordination
- **Configurable**: Environment-based RPC configuration

## 📋 Supported Bridges

| Bridge | Protocol | Supported Chains |
|--------|----------|------------------|
| Stargate | LayerZero | Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom |
| Celer cBridge | Celer Network | Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom |
| Wormhole | Portal | Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom |
| Synapse | Synapse Protocol | Ethereum, BSC, Polygon, Arbitrum, Avalanche |
| Hop Protocol | Hop | Ethereum, Polygon, Arbitrum, Optimism |
| deBridge | deBridge | Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom |
| Across Protocol | Across | Ethereum, Polygon, Arbitrum, Optimism |
| Orbiter Finance | Orbiter | Ethereum, Arbitrum, Optimism, zkSync, Linea, Base, Polygon |
| xBridge | xBridge | Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom |

## 🔧 Setup

### 1. Environment Configuration

Create a `.env` file with RPC URLs for each chain:

```env
# Ethereum
ETHEREUM_RPC_URL=https://eth.llamarpc.com

# BSC
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Polygon
POLYGON_RPC_URL=https://polygon-rpc.com/

# Arbitrum
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Optimism
OPTIMISM_RPC_URL=https://mainnet.optimism.io

# Avalanche
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# Fantom
FANTOM_RPC_URL=https://rpc.ftm.tools/

# zkSync
ZKSYNC_RPC_URL=https://mainnet.era.zksync.io

# Linea
LINEA_RPC_URL=https://rpc.linea.build

# Base
BASE_RPC_URL=https://mainnet.base.org

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/chainhawk_db
```

### 2. Database Setup

Ensure your PostgreSQL database has the `bridge_transactions` table:

```sql
CREATE TABLE IF NOT EXISTS bridge_transactions (
  id SERIAL PRIMARY KEY,
  bridge_protocol VARCHAR(50) NOT NULL,
  source_chain VARCHAR(50) NOT NULL,
  destination_chain VARCHAR(50) NOT NULL,
  source_address VARCHAR(42),
  destination_address VARCHAR(42),
  token_address VARCHAR(42),
  amount DECIMAL(65,18),
  transaction_hash VARCHAR(66) UNIQUE NOT NULL,
  block_number BIGINT,
  event_type VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'PENDING',
  risk_score INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📖 Usage

### 1. Individual Bridge Listener

```javascript
const { startBridgeWatcher } = require('./src/services/bridges/stargate');

// Start Stargate listener on Ethereum
const listener = await startBridgeWatcher('ethereum', process.env.ETHEREUM_RPC_URL, (data) => {
  console.log('Bridge event:', data);
  // Handle the bridge event
});

// Stop the listener
await listener.stopMonitoring();
```

### 2. Master Bridge Manager

```javascript
const { createBridgeManager } = require('./src/services/bridges/bridgeManager');

// Create and initialize bridge manager
const bridgeManager = await createBridgeManager();

// Start all bridges
await bridgeManager.startAllBridges((data) => {
  console.log('Bridge event:', data);
  // Handle all bridge events
});

// Start specific bridge
await bridgeManager.startBridge('STARGATE', 'ethereum', (data) => {
  console.log('Stargate event:', data);
});

// Get status
const status = bridgeManager.getStatus();
console.log('Bridge status:', status);

// Get recent transactions
const transactions = await bridgeManager.getRecentTransactions(10);

// Stop all bridges
await bridgeManager.stopAllBridges();

// Cleanup
await bridgeManager.cleanup();
```

### 3. Event Data Structure

Each bridge event contains the following data:

```javascript
{
  protocol: 'STARGATE',           // Bridge protocol name
  sourceChain: 'ethereum',        // Source blockchain
  destinationChain: 'bsc',        // Destination blockchain
  sourceAddress: '0x...',         // Sender address
  destinationAddress: '0x...',    // Receiver address
  tokenAddress: '0x...',          // Token contract address
  amount: '1000.0',               // Transfer amount (formatted)
  txHash: '0x...',                // Transaction hash
  blockNumber: 12345678,          // Block number
  eventType: 'SendMsg',           // Event type
  timestamp: '2024-01-01T00:00:00.000Z',
  metadata: {                     // Additional protocol-specific data
    contractAddress: '0x...',
    network: 'ethereum',
    // ... other fields
  }
}
```

## 🧪 Testing

### Run Full Test Suite

```bash
node test-modular-bridges.js
```

### Test Specific Bridge

```bash
node test-modular-bridges.js stargate ethereum
```

### Test Scripts

```javascript
const { testModularBridges, testIndividualBridge } = require('./test-modular-bridges');

// Test entire system
await testModularBridges();

// Test specific bridge
await testIndividualBridge('stargate', 'ethereum');
```

## 🔍 Monitoring and Debugging

### Status Monitoring

```javascript
const status = bridgeManager.getStatus();
console.log('Running listeners:', status.runningListeners);
console.log('Failed listeners:', status.failedListeners);

// Check specific bridge status
console.log('Stargate status:', status.bridges.STARGATE);
```

### Logging

The system provides comprehensive logging:

- `🔗` - Connection events
- `✅` - Success events
- `❌` - Error events
- `📡` - Bridge events
- `🔄` - Reconnection attempts
- `🛑` - Stop events

### Error Handling

Each bridge listener includes:

- Automatic reconnection with exponential backoff
- Maximum reconnection attempts (default: 5)
- Graceful error handling
- Status tracking

## 🚀 Production Deployment

### 1. Environment Variables

Ensure all RPC URLs are configured with reliable endpoints:

```env
# Use multiple RPC providers for redundancy
ETHEREUM_RPC_URL=https://eth.llamarpc.com,https://mainnet.infura.io/v3/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/,https://bsc-dataseed1.defibit.io/
```

### 2. Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX idx_bridge_transactions_timestamp ON bridge_transactions(timestamp);
CREATE INDEX idx_bridge_transactions_protocol ON bridge_transactions(bridge_protocol);
CREATE INDEX idx_bridge_transactions_hash ON bridge_transactions(transaction_hash);
```

### 3. Monitoring

```javascript
// Set up health checks
setInterval(() => {
  const status = bridgeManager.getStatus();
  if (status.failedListeners > 0) {
    console.error('Some bridge listeners have failed');
    // Send alert
  }
}, 60000); // Check every minute
```

## 🔧 Customization

### Adding New Bridge

1. Create new bridge file in `src/services/bridges/`
2. Implement the required interface
3. Add to `bridgeManager.js` configuration
4. Update this documentation

### Custom Event Handler

```javascript
const customEventHandler = async (bridgeData) => {
  // Custom processing logic
  await saveToCustomDatabase(bridgeData);
  await sendNotification(bridgeData);
  await updateAnalytics(bridgeData);
};

await bridgeManager.startAllBridges(customEventHandler);
```

## 📊 Performance Considerations

- **RPC Rate Limits**: Monitor API usage and implement rate limiting
- **Database Connections**: Use connection pooling for PostgreSQL
- **Memory Usage**: Monitor memory consumption with many listeners
- **Network Stability**: Implement robust error handling for network issues

## 🔒 Security

- **RPC Security**: Use HTTPS endpoints and API keys where required
- **Database Security**: Implement proper access controls
- **Event Validation**: Validate all incoming bridge events
- **Error Logging**: Avoid logging sensitive data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

1. Check the logs for error messages
2. Verify RPC URLs are accessible
3. Ensure database connection is working
4. Test individual bridge listeners
5. Create an issue with detailed error information 