# Setting Up Real Transaction Data

## Why You're Seeing Mock Data

Your system is currently showing mock data because:

1. **No API Keys Configured** - The blockchain explorer API keys are set to placeholder values
2. **Mock Data Generation Active** - Even in REAL mode, mock data was being generated
3. **Limited Real Data Collection** - Only basic transaction polling was implemented

## ✅ Fixed Issues

I've made the following improvements:

1. **Enhanced Real Data Collection** - Now polls multiple chains and protocols
2. **Disabled Mock Data in REAL Mode** - Mock data only generates in MOCK/HYBRID mode
3. **Added Public Data Fallback** - Can fetch some real data without API keys
4. **Better Error Handling** - Clear logging when API keys are missing

## 🔑 Getting Real API Keys (Recommended)

For the best experience, get free API keys from:

### 1. Etherscan (Ethereum)
- Visit: https://etherscan.io/apis
- Sign up for free account
- Get API key
- Update `ETHERSCAN_API_KEY` in docker-compose.yml

### 2. BSCScan (Binance Smart Chain)
- Visit: https://bscscan.com/apis
- Sign up for free account
- Get API key
- Update `BSCSCAN_API_KEY` in docker-compose.yml

### 3. PolygonScan (Polygon)
- Visit: https://polygonscan.com/apis
- Sign up for free account
- Get API key
- Update `POLYGONSCAN_API_KEY` in docker-compose.yml

### 4. Arbiscan (Arbitrum)
- Visit: https://arbiscan.io/apis
- Sign up for free account
- Get API key
- Update `ARBISCAN_API_KEY` in docker-compose.yml

## 🚀 Quick Start (No API Keys Required)

If you want to test with real data immediately:

1. **Restart the backend service:**
   ```bash
   docker-compose restart backend
   ```

2. **Check the logs:**
   ```bash
   docker-compose logs -f backend
   ```

3. **Look for messages like:**
   ```
   📊 Found X Stargate transactions on Ethereum (public data)
   🔗 Processed real STARGATE transaction on Ethereum: 0x...
   ```

## 📊 What You'll See Now

### With API Keys (Full Experience):
- Real transactions from all 4 bridge protocols
- Data from Ethereum, BSC, Polygon, Arbitrum
- 50 transactions per protocol per chain
- Updated every 60 seconds

### Without API Keys (Limited):
- Real transactions from Stargate on Ethereum
- 10 transactions per poll
- Updated every 60 seconds
- No mock data interference

## 🔍 Testing Real Data

1. **Search for a real address** that has used bridges:
   - Try: `0x8731d54E9D02c286767d56ac03e8037C07e01e98` (Stargate Router)
   - Or any address that has interacted with bridge contracts

2. **Check the transaction details:**
   - Look for `"realData": true` in metadata
   - Real transactions will have actual gas used, block numbers, etc.

3. **Monitor the logs:**
   ```bash
   docker-compose logs -f backend | grep "Processed real"
   ```

## 🛠️ Troubleshooting

### Still seeing mock data?
1. Check if monitoring mode is set to `REAL`:
   ```bash
   docker-compose logs backend | grep "BRIDGE_MONITORING_MODE"
   ```

2. Restart the backend:
   ```bash
   docker-compose restart backend
   ```

3. Clear existing mock data:
   ```sql
   DELETE FROM "BridgeTransaction" WHERE metadata->>'mock' = 'true';
   ```

### No real data appearing?
1. Check API key configuration
2. Look for error messages in logs
3. Try the public data fallback first

## 📈 Next Steps

1. **Get API keys** for full functionality
2. **Monitor real transactions** as they happen
3. **Test with known bridge users**
4. **Explore cross-chain transaction linking**

Your system now has the infrastructure to collect and display real bridge transaction data! 