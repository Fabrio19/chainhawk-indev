# cBridge Integration Guide

## Overview
This guide explains how to integrate Celer cBridge into the real-time bridge monitoring system.

## Current Status
- ✅ Placeholder ABI created
- ⏳ Real contract addresses needed
- ⏳ Real ABI from Celer docs needed

## Step 1: Get Real Contract Addresses

### 1.1 Visit Celer Documentation
Go to: https://cbridge-docs.celer.network/developer/reference/contract-addresses

### 1.2 Find Contract Addresses
Look for the following contracts:
- **Ethereum Mainnet**: cBridge Router contract
- **BSC Mainnet**: cBridge Router contract
- **Polygon**: cBridge Router contract
- **Arbitrum**: cBridge Router contract
- **Optimism**: cBridge Router contract

### 1.3 Update Configuration
Once you have the addresses, update them in:
```javascript
// File: backend/src/services/bridges/bridgeWatcher.js

// Replace the placeholder with real addresses
const CELER_CONTRACTS = {
  ethereum: "0x...", // Real Ethereum cBridge address
  bsc: "0x...",      // Real BSC cBridge address
  polygon: "0x...",  // Real Polygon cBridge address
  arbitrum: "0x...", // Real Arbitrum cBridge address
  optimism: "0x..."  // Real Optimism cBridge address
};
```

## Step 2: Get Real ABI

### 2.1 Method 1: Etherscan/BSCscan
1. Go to the contract address on Etherscan/BSCscan
2. Click "Contract" tab
3. Click "ABI" section
4. Copy the JSON ABI

### 2.2 Method 2: Celer GitHub
Check Celer's GitHub repository for official ABIs:
- https://github.com/celer-network/sgn-v2-contracts

### 2.3 Method 3: Celer Documentation
Check the official documentation for ABI references.

## Step 3: Update the ABI File

### 3.1 Replace Placeholder ABI
```javascript
// File: backend/src/services/abis/realBridgeABIs.js

// Replace CBRIDGE_PLACEHOLDER_ABI with real ABI
const CBRIDGE_REAL_ABI = [
  // Paste the real ABI here
  // Make sure it includes these key events:
  // - Send
  // - Relay  
  // - Receive
  // - Transfer
];
```

### 3.2 Key Events to Look For
The real ABI should include these events:
- `Send`: When a user initiates a cross-chain transfer
- `Relay`: When a relayer processes the transfer
- `Receive`: When the transfer is received on destination chain
- `Transfer`: Standard ERC20 transfer events

## Step 4: Update Bridge Watcher

### 4.1 Uncomment and Update cBridge Section
```javascript
// File: backend/src/services/bridges/bridgeWatcher.js

// Uncomment and update this section:
await watchBridge({
  providerUrl: process.env.ETHEREUM_RPC_URL,
  address: CELER_CONTRACTS.ethereum, // Use real address
  abi: CBRIDGE_REAL_ABI, // Use real ABI
  eventNames: ["Send", "Relay", "Receive"], // Use real event names
  srcChain: "ethereum",
  dstChain: "bsc",
  bridgeName: "cBridge"
});
```

### 4.2 Add Multiple Chain Support
```javascript
// Add watchers for all supported chains
const celerChains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'];

for (const chain of celerChains) {
  await watchBridge({
    providerUrl: process.env[`${chain.toUpperCase()}_RPC_URL`],
    address: CELER_CONTRACTS[chain],
    abi: CBRIDGE_REAL_ABI,
    eventNames: ["Send", "Relay", "Receive"],
    srcChain: chain,
    dstChain: "cross-chain", // Will be determined by event data
    bridgeName: "cBridge"
  });
}
```

## Step 5: Test the Integration

### 5.1 Run Test Script
```bash
cd backend
node test-real-bridge-watcher.js
```

### 5.2 Start Real Monitoring
```bash
cd backend
node src/services/bridges/bridgeWatcher.js
```

### 5.3 Verify Events
```sql
-- Check if cBridge events are being captured
SELECT * FROM bridge_events 
WHERE bridge = 'cBridge' 
ORDER BY timestamp DESC 
LIMIT 10;
```

## Step 6: Environment Variables

### 6.1 Required Variables
Make sure these are set in your `.env` file:
```env
# RPC URLs for all chains
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/
POLYGON_RPC_URL=https://polygon-rpc.com/
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/chainhawk_db
```

## Troubleshooting

### Common Issues

1. **"Contract not found" error**
   - Verify the contract address is correct
   - Check if the contract exists on the specified chain

2. **"Event not found" error**
   - Verify the event names in the ABI
   - Check if the event signatures match

3. **"RPC connection failed" error**
   - Verify RPC URLs are correct
   - Check if you have proper API keys

4. **"Database connection failed" error**
   - Verify DATABASE_URL is correct
   - Check if PostgreSQL is running

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=true
```

## Example Real ABI Structure

Here's what a real cBridge ABI might look like:
```javascript
const CBRIDGE_REAL_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "dstChainId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "nonce",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "maxSlippage",
        "type": "uint32"
      }
    ],
    "name": "Send",
    "type": "event"
  }
  // ... more events
];
```

## Next Steps

1. **Get real contract addresses** from Celer docs
2. **Get real ABI** from Etherscan or Celer docs
3. **Update the configuration** with real data
4. **Test the integration** with the test script
5. **Start real monitoring** and verify events are captured

## Support

If you encounter issues:
1. Check the Celer documentation
2. Verify contract addresses on block explorers
3. Test with the provided test scripts
4. Check the logs for error messages 