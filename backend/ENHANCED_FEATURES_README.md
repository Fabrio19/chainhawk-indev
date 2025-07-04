# Enhanced Bridge Monitoring Features

This document describes the enhanced features implemented in the ChainHawk Bridge Monitoring System.

## 🚨 High-Risk Transaction Alerts

### Telegram/Discord Notifications

The system now sends real-time alerts for high-risk bridge transactions via Telegram and Discord.

#### Configuration

Add the following environment variables to your `.env` file:

```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Discord Configuration
DISCORD_WEBHOOK_URL=your_webhook_url_here

# Optional: Test notifications on startup
TEST_NOTIFICATIONS=true
```

#### Alert Triggers

Alerts are sent when:
- Risk score ≥ 70% (0.7)
- ₹10L+ threshold transactions detected
- Sanctions matches found
- Suspicious patterns detected

#### Alert Format

**Telegram Alert:**
```
🚨 HIGH-RISK BRIDGE TRANSACTION

📊 Risk Score: 85.0%
🌉 Bridge: Stargate
💰 Amount: 1,000,000 USDC
🔗 Chains: Ethereum → Polygon
👤 From: 0x1234...5678
👤 To: 0x9876...4321
🔗 Tx Hash: 0xabcd...7890
⚠️ Risk Flags: HIGH_VALUE, SANCTIONS_MATCH

⏰ Detected: 2024-01-15 14:30:25
```

**Discord Alert:**
Rich embed with color-coded risk levels and detailed transaction information.

## 📊 Hourly CSV Export

### Automatic Export

The system automatically exports bridge transactions to CSV files every hour.

#### Configuration

```bash
# Export directory (optional, defaults to ./exports)
CSV_EXPORT_DIR=./exports
```

#### Export Schedule

- **Hourly**: All transactions from the last hour
- **High-Risk**: Transactions with risk score ≥ 70% (last 24 hours)
- **Custom Range**: On-demand exports for specific date ranges

#### CSV Format

```csv
Transaction Hash,Bridge Protocol,Source Chain,Destination Chain,Source Address,Destination Address,Token Address,Token Symbol,Amount,Risk Score,Risk Flags,Status,Block Number,Timestamp,Created At
0xabcd...,Stargate,Ethereum,Polygon,0x1234...,0x5678...,0xabcd...,USDC,1000000,0.85,"HIGH_VALUE;INR_10L_THRESHOLD",CONFIRMED,19234567,2024-01-15T14:30:25.000Z,2024-01-15T14:30:25.000Z
```

#### Export Features

- **Automatic cleanup**: Old files deleted after 30 days
- **Compression**: Large exports are compressed
- **Statistics**: Export stats tracked in database
- **Error handling**: Failed exports are logged and retried

## 🔄 Advanced Loop Detection

### Pattern Detection

The system detects complex looping patterns in bridge transactions:

- **Simple Loops**: A → B → A
- **Complex Loops**: A → B → C → A
- **Extended Loops**: A → B → C → D → A

#### Detection Algorithm

1. **Path Analysis**: Tracks transaction paths through multiple wallets
2. **Time Window**: Analyzes transactions within 24-hour window
3. **Risk Scoring**: Calculates risk based on loop characteristics
4. **Pattern Classification**: Categorizes loops by complexity

#### Loop Risk Factors

- **Duration**: Shorter loops = higher risk
- **Amount**: Higher amounts = higher risk
- **Frequency**: More loops = higher risk
- **Bridge Diversity**: Multiple bridges = higher risk

#### Detection Schedule

- **Continuous**: Runs every 30 minutes
- **Real-time**: Triggers on new transactions
- **Batch Processing**: Analyzes historical data

## 💰 ₹10L Threshold Flagging

### Multi-Level Thresholds

The system implements comprehensive INR-based threshold monitoring:

- **₹10 Lakh**: 1,000,000 INR (≈ $12,000 USD)
- **₹50 Lakh**: 5,000,000 INR (≈ $60,000 USD)
- **₹1 Crore**: 10,000,000 INR (≈ $120,000 USD)

#### Implementation

```javascript
// Risk thresholds in riskScoringEngine.js
this.riskThresholds = {
  INR_10L_THRESHOLD: 1000000,  // ₹10 Lakh
  INR_50L_THRESHOLD: 5000000,  // ₹50 Lakh
  INR_1CR_THRESHOLD: 10000000  // ₹1 Crore
};
```

#### Flagging Logic

1. **Amount Conversion**: USD → INR conversion (1 USD ≈ 83 INR)
2. **Threshold Check**: Compares transaction value against thresholds
3. **Risk Scoring**: Assigns risk scores based on threshold levels
4. **Alert Generation**: Triggers notifications for flagged transactions

#### Risk Flags

- `INR_10L_THRESHOLD`: Transactions ≥ ₹10 Lakh
- `INR_50L_THRESHOLD`: Transactions ≥ ₹50 Lakh
- `INR_1CR_THRESHOLD`: Transactions ≥ ₹1 Crore
- `HIGH_VALUE_TRANSFER`: General high-value flag

## 🔍 Enhanced Risk Scoring

### Comprehensive Risk Assessment

The risk scoring engine now includes:

#### Risk Categories

1. **Amount Risk**: Based on transaction value and INR thresholds
2. **Frequency Risk**: Based on transaction frequency
3. **Pattern Risk**: Based on suspicious patterns
4. **Sanctions Risk**: Based on sanctions list matches
5. **Timing Risk**: Based on transaction timing
6. **Bridge Risk**: Based on bridge protocol characteristics

#### Risk Calculation

```javascript
// Normalized risk score (0-1)
const normalizedScore = Math.min(totalScore / 100, 1.0);

// Risk flags for categorization
const flags = ['INR_10L_THRESHOLD', 'FREQUENT_TRANSFER', 'SUSPICIOUS_PATTERN'];
```

#### Risk Thresholds

- **Low Risk**: 0-30% (0.0-0.3)
- **Medium Risk**: 30-60% (0.3-0.6)
- **High Risk**: 60-80% (0.6-0.8)
- **Critical Risk**: 80-100% (0.8-1.0)

## 🚀 Integration with Bridge Monitoring

### Service Integration

All enhanced features are integrated into the main bridge monitoring system:

```javascript
// EnhancedBridgeWatcher.js
class EnhancedBridgeWatcher {
  constructor() {
    // Core services
    this.notificationService = new NotificationService();
    this.csvExportService = new CSVExportService();
    this.loopDetectionService = new LoopDetectionService();
    this.riskScoringEngine = new RiskScoringEngine();
  }
}
```

### Event Processing Flow

1. **Transaction Detection**: Bridge events are captured
2. **Risk Assessment**: Enhanced risk scoring applied
3. **Threshold Check**: ₹10L+ transactions flagged
4. **Alert Generation**: High-risk notifications sent
5. **Data Export**: Transactions added to hourly CSV
6. **Loop Detection**: Patterns analyzed for loops
7. **Database Storage**: All data saved to PostgreSQL

## 🧪 Testing

### Test Script

Run the enhanced features test:

```bash
cd backend
node test-enhanced-features.js
```

### Test Coverage

The test script verifies:

1. **Notification Service**: Telegram/Discord connectivity
2. **CSV Export**: File generation and statistics
3. **Loop Detection**: Pattern detection and statistics
4. **Risk Scoring**: ₹10L threshold flagging
5. **Service Integration**: All services working together

### Expected Output

```
🧪 Testing Enhanced Bridge Monitoring Features...
==========================================

1️⃣ Testing Telegram/Discord Notifications...
✅ Notification service is enabled
📱 Active channels: telegram, discord
✅ Test notification sent

2️⃣ Testing CSV Export Service...
✅ Export stats: 5 files, 1250.50 KB
📅 Last export: 2024-01-15T14:00:00.000Z
✅ High-risk export created: ./exports/high-risk-transactions-2024-01-15-14.csv

3️⃣ Testing Loop Detection Service...
✅ Detected 3 looping patterns
📊 Loop stats: 3 total, 1 high-risk
   Simple loops: 1, Complex: 1, Extended: 1
   Average risk score: 45.2%

4️⃣ Testing Enhanced Risk Scoring with ₹10L Thresholds...
   Transaction 1: 500000 USDC
   Risk Score: 15.0%
   Risk Flags: 

   Transaction 2: 1500000 USDC
   Risk Score: 35.0%
   Risk Flags: INR_10L_THRESHOLD, HIGH_VALUE_TRANSFER
   🚨 ₹10L+ THRESHOLD FLAGGED!

   Transaction 3: 5000000 USDC
   Risk Score: 55.0%
   Risk Flags: INR_50L_THRESHOLD, HIGH_VALUE_TRANSFER
   🚨 ₹50L+ THRESHOLD FLAGGED!

5️⃣ Testing Service Integration...
✅ 4/4 services are active
🎉 All enhanced features are working!

==========================================
✅ Enhanced Features Test Completed!
```

## 📋 Configuration Summary

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# RPC URLs
ETHEREUM_RPC_URL=https://...
BSC_RPC_URL=https://...
POLYGON_RPC_URL=https://...

# Notifications (Optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
DISCORD_WEBHOOK_URL=your_webhook_url

# Export (Optional)
CSV_EXPORT_DIR=./exports

# Testing (Optional)
TEST_NOTIFICATIONS=true
```

### Service Status

| Service | Status | Configuration Required |
|---------|--------|----------------------|
| Notifications | ✅ Active | Telegram/Discord webhooks |
| CSV Export | ✅ Active | None (auto-created) |
| Loop Detection | ✅ Active | None (automatic) |
| Risk Scoring | ✅ Active | None (automatic) |

## 🔧 Troubleshooting

### Common Issues

1. **Notifications not working**
   - Check webhook URLs in .env
   - Verify bot tokens and chat IDs
   - Check network connectivity

2. **CSV exports failing**
   - Check write permissions for export directory
   - Verify disk space
   - Check database connectivity

3. **Loop detection not finding patterns**
   - Ensure sufficient transaction data
   - Check time window settings
   - Verify database queries

4. **Risk scoring errors**
   - Check database schema
   - Verify token price data
   - Check sanctions list connectivity

### Debug Mode

Enable debug logging:

```bash
DEBUG=bridge:* node start-enhanced-monitoring.js
```

## 📈 Performance Considerations

### Resource Usage

- **Memory**: ~100MB additional for enhanced features
- **CPU**: Minimal impact (< 5% additional)
- **Storage**: CSV exports ~1MB/hour
- **Network**: Notifications ~1KB per alert

### Optimization Tips

1. **Export Cleanup**: Run daily cleanup of old CSV files
2. **Loop Detection**: Adjust time window based on volume
3. **Notifications**: Rate limit alerts to prevent spam
4. **Database**: Index frequently queried fields

## 🔮 Future Enhancements

### Planned Features

1. **Email Notifications**: SMTP-based alerts
2. **Slack Integration**: Slack webhook support
3. **Advanced Analytics**: Machine learning risk models
4. **Real-time Dashboard**: WebSocket updates
5. **API Endpoints**: REST API for external access

### Customization

All features can be customized:

- **Thresholds**: Adjust INR amounts
- **Risk Weights**: Modify risk calculation
- **Alert Rules**: Custom notification triggers
- **Export Formats**: Additional file formats
- **Detection Algorithms**: Enhanced pattern recognition

---

**Note**: This enhanced system provides comprehensive monitoring, alerting, and compliance features for cross-chain bridge transactions with specific focus on Indian regulatory requirements (₹10L+ thresholds). 