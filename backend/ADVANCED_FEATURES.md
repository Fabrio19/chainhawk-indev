# Advanced Features Documentation

This document describes the advanced features implemented in ChainHawk Compliance Platform, including ML-based risk scoring, advanced PDF generation, real-time WebSocket notifications, and D3.js visualizations.

## 🚀 Features Overview

### 1. Advanced PDF Generation with Puppeteer
- **Purpose**: Generate professional, high-quality PDF reports
- **Features**: 
  - Transaction trace reports with interactive elements
  - Risk assessment reports with charts and metrics
  - Compliance reports with detailed checklists
  - Custom styling and branding
  - Header/footer templates

### 2. ML-based Risk Scoring Engine
- **Purpose**: Advanced machine learning-based risk assessment
- **Features**:
  - Multi-model ensemble prediction
  - Transaction, entity, and pattern analysis
  - Feature extraction and normalization
  - Risk insights and flagging
  - Model performance monitoring

### 3. Real-time WebSocket Notifications
- **Purpose**: Real-time updates and alerts
- **Features**:
  - Authenticated WebSocket connections
  - Channel-based subscriptions
  - High-risk transaction alerts
  - Bridge monitoring updates
  - System status notifications

### 4. Advanced D3.js Visualizations
- **Purpose**: Interactive data visualizations
- **Features**:
  - Transaction flow network graphs
  - Risk analysis heatmaps
  - Bridge activity timelines
  - Entity relationship graphs
  - Pattern analysis charts

## 📦 Installation

### Prerequisites
```bash
# Install Node.js dependencies
npm install

# Install additional dependencies for advanced features
npm install puppeteer ws d3
```

### Environment Variables
Add these to your `.env` file:
```env
# PDF Generation
PDF_REPORTS_DIR=./reports/pdf

# WebSocket Configuration
WS_PORT=8081
WS_HEARTBEAT_INTERVAL=30000

# ML Model Configuration
ML_MODEL_VERSION=1.0.0
ML_CONFIDENCE_THRESHOLD=0.7

# Visualization Configuration
CHARTS_DIR=./charts
D3_VERSION=7.8.5
```

## 🔧 Setup Instructions

### 1. PDF Generation Setup
```bash
# Create reports directory
mkdir -p reports/pdf

# Install Puppeteer (if not already installed)
npm install puppeteer

# For Docker environments, ensure Chrome dependencies are available
# Add to Dockerfile:
# RUN apt-get update && apt-get install -y \
#     chromium-browser \
#     fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf
```

### 2. WebSocket Service Integration
```javascript
// In your main server file (src/index.js)
const WebSocketService = require('./services/websocketService');

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Make it available to routes
app.set('websocketService', wsService);
```

### 3. ML Model Training (Optional)
```bash
# For production, you can train custom models
# This is currently using simulated models
# In the future, you can integrate with TensorFlow.js or similar
```

## 📖 Usage Examples

### 1. Advanced PDF Generation

#### Generate Transaction Trace PDF
```javascript
const AdvancedPdfService = require('./services/advancedPdfService');
const pdfService = new AdvancedPdfService();

const traceData = {
  traceId: 'TRACE-001',
  steps: [...], // Transaction steps
  totalVolume: 1000000,
  riskScore: 0.75,
  chains: ['Ethereum', 'Polygon'],
  riskFactors: ['High volume', 'Cross-chain activity']
};

const result = await pdfService.generateTransactionTracePDF(traceData, {
  includeCharts: true,
  watermark: 'ChainHawk Compliance'
});

console.log(`PDF generated: ${result.filename}`);
```

#### Generate Risk Assessment PDF
```javascript
const assessmentData = {
  overallRisk: 0.72,
  transactionCount: 150,
  highRiskCount: 25,
  totalVolume: 5000000,
  riskBreakdown: [...],
  recommendations: [...]
};

const result = await pdfService.generateRiskAssessmentPDF(assessmentData, {
  includeRecommendations: true
});
```

### 2. ML Risk Scoring

#### Assess Transaction Risk
```javascript
const MLRiskScoringEngine = require('./services/mlRiskScoringEngine');
const mlEngine = new MLRiskScoringEngine();

const transaction = {
  transactionHash: '0x123...',
  sourceAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  destinationAddress: '0x8ba1f109551bD432803012645Hac136c772c3',
  amount: '1000000',
  tokenSymbol: 'USDT',
  sourceChain: 'Ethereum',
  destinationChain: 'Polygon',
  bridgeProtocol: 'Polygon Bridge',
  timestamp: new Date().toISOString()
};

const assessment = await mlEngine.assessRisk(transaction, {
  chains: ['Ethereum', 'Polygon'],
  tokens: ['USDT'],
  duration: 3600000
});

console.log(`Risk Score: ${(assessment.score * 100).toFixed(1)}%`);
console.log(`Risk Level: ${assessment.riskLevel}`);
console.log(`Risk Flags: ${assessment.riskFlags.join(', ')}`);
```

#### Get Model Performance
```javascript
const performance = await mlEngine.getModelPerformance();
console.log(`Accuracy: ${(performance.accuracy * 100).toFixed(1)}%`);
console.log(`Precision: ${(performance.precision * 100).toFixed(1)}%`);
console.log(`Recall: ${(performance.recall * 100).toFixed(1)}%`);
```

### 3. WebSocket Notifications

#### Server-side Usage
```javascript
const WebSocketService = require('./services/websocketService');

// Initialize in your server
const wsService = new WebSocketService(server);

// Send high-risk alert
wsService.sendHighRiskAlert(transaction, riskScore, riskFlags);

// Send bridge update
wsService.sendBridgeUpdate({
  bridge: 'Polygon Bridge',
  status: 'active',
  volume: 1000000,
  transactions: 50
});

// Send system status
wsService.sendSystemStatus({
  status: 'healthy',
  uptime: process.uptime(),
  memory: process.memoryUsage()
});
```

#### Client-side Usage
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8081?token=YOUR_JWT_TOKEN');

ws.onopen = function() {
  console.log('Connected to WebSocket');
  
  // Subscribe to channels
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE',
    channels: ['alerts', 'high-risk', 'bridge-monitoring']
  }));
};

ws.onmessage = function(event) {
  const message = JSON.parse(event.data);
  
  switch(message.type) {
    case 'HIGH_RISK_ALERT':
      console.log('High-risk transaction detected:', message.transaction);
      break;
    case 'BRIDGE_UPDATE':
      console.log('Bridge update:', message);
      break;
    case 'SYSTEM_STATUS':
      console.log('System status:', message.status);
      break;
  }
};

// Send heartbeat
setInterval(() => {
  ws.send(JSON.stringify({ type: 'HEARTBEAT' }));
}, 30000);
```

### 4. D3.js Visualizations

#### Generate Transaction Flow Graph
```javascript
const VisualizationService = require('./services/visualizationService');
const vizService = new VisualizationService();

const transactions = [
  // ... transaction data
];

const graphData = await vizService.generateTransactionFlowGraph(transactions, {
  width: 1200,
  height: 800,
  nodeRadius: 8,
  linkDistance: 100
});

// Use the generated D3.js code
console.log(graphData.d3Code);
```

#### Generate Risk Heatmap
```javascript
const heatmapData = await vizService.generateRiskHeatmap(transactions, {
  timeInterval: 'hour',
  width: 800,
  height: 400
});
```

#### Generate Bridge Timeline
```javascript
const timelineData = await vizService.generateBridgeTimeline(transactions, {
  timeInterval: 'day'
});
```

## 🔌 API Endpoints

### PDF Generation
- `POST /api/advanced/pdf/trace` - Generate transaction trace PDF
- `POST /api/advanced/pdf/risk-assessment` - Generate risk assessment PDF
- `POST /api/advanced/pdf/compliance-report` - Generate compliance report PDF

### ML Risk Scoring
- `POST /api/advanced/ml/assess-risk` - Assess transaction risk using ML
- `GET /api/advanced/ml/performance` - Get ML model performance metrics
- `POST /api/advanced/ml/update-models` - Update ML models with new data

### Visualizations
- `POST /api/advanced/visualization/transaction-flow` - Generate transaction flow graph
- `POST /api/advanced/visualization/risk-heatmap` - Generate risk heatmap
- `POST /api/advanced/visualization/bridge-timeline` - Generate bridge timeline
- `POST /api/advanced/visualization/entity-graph` - Generate entity relationship graph
- `POST /api/advanced/visualization/pattern-analysis` - Generate pattern analysis

### WebSocket
- `GET /api/advanced/websocket/stats` - Get WebSocket connection statistics

### Comprehensive Analysis
- `POST /api/advanced/comprehensive-analysis` - Run comprehensive analysis

## 🧪 Testing

### Run Advanced Features Test
```bash
# Test all advanced features
node test-advanced-features.js
```

### Expected Output
```
🚀 Testing Advanced Features...

📊 1. Testing ML Risk Scoring Engine...
   Transaction 0x12345678...
   - Risk Score: 75.2%
   - Risk Level: HIGH
   - Risk Flags: ML_TRANSACTION_RISK, HIGH_RISK
   - Confidence: 87.3%

📈 2. Testing D3.js Visualization Service...
   ✅ Transaction flow graph generated
   - Nodes: 3
   - Links: 3
   - Total volume: 4000000

📄 3. Testing Advanced PDF Generation...
   ✅ Transaction trace PDF generated: trace-TRACE-001-1234567890.pdf
   - File size: 245.67 KB

🔌 4. Testing WebSocket Service (Simulated)...
   ✅ WebSocket service would handle real-time updates

🎯 5. Testing Comprehensive Analysis...
   ✅ Comprehensive analysis completed

✅ All Advanced Features Tested Successfully!
```

## 🔒 Security Considerations

### WebSocket Security
- All WebSocket connections require JWT authentication
- Channel access is controlled by user roles
- Heartbeat mechanism prevents stale connections
- Rate limiting on message frequency

### ML Model Security
- Models are validated before deployment
- Input data is sanitized and validated
- Model predictions are logged for audit
- Fallback mechanisms for model failures

### PDF Generation Security
- Generated files are stored in secure directories
- File access is controlled by authentication
- Temporary files are cleaned up automatically
- Content validation prevents injection attacks

## 🚀 Production Deployment

### Docker Configuration
```dockerfile
# Add to your Dockerfile
RUN apt-get update && apt-get install -y \
    chromium-browser \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Environment Variables for Production
```env
# Production settings
NODE_ENV=production
PDF_REPORTS_DIR=/app/reports/pdf
CHARTS_DIR=/app/charts
WS_PORT=8081
ML_MODEL_VERSION=1.0.0
ML_CONFIDENCE_THRESHOLD=0.8
```

### Monitoring and Logging
```javascript
// Add monitoring for advanced features
const monitoring = {
  pdfGeneration: {
    success: 0,
    failures: 0,
    averageTime: 0
  },
  mlAssessment: {
    requests: 0,
    averageScore: 0,
    highRiskCount: 0
  },
  websocket: {
    connections: 0,
    messages: 0,
    errors: 0
  }
};
```

## 🔧 Troubleshooting

### Common Issues

#### PDF Generation Fails
```bash
# Check Puppeteer installation
npm list puppeteer

# For Docker environments, ensure Chrome is available
docker exec -it container_name which chromium-browser

# Check file permissions
ls -la reports/pdf/
```

#### WebSocket Connection Issues
```bash
# Check WebSocket port
netstat -tulpn | grep 8081

# Check authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/auth/verify
```

#### ML Model Performance Issues
```bash
# Check model performance
curl http://localhost:3000/api/advanced/ml/performance

# Restart ML service if needed
pm2 restart ml-risk-scoring
```

### Performance Optimization

#### PDF Generation
- Use connection pooling for database queries
- Implement caching for frequently generated reports
- Optimize HTML templates for faster rendering
- Use worker threads for heavy PDF generation

#### ML Risk Scoring
- Implement model caching
- Use batch processing for multiple transactions
- Optimize feature extraction algorithms
- Monitor memory usage during predictions

#### WebSocket
- Implement connection pooling
- Use Redis for scaling across multiple instances
- Optimize message serialization
- Implement message queuing for high load

## 📚 Additional Resources

### Documentation
- [Puppeteer Documentation](https://pptr.dev/)
- [D3.js Documentation](https://d3js.org/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Machine Learning Best Practices](https://developers.google.com/machine-learning/guides/rules-of-ml)

### Examples
- [PDF Generation Examples](./examples/pdf-generation/)
- [WebSocket Examples](./examples/websocket/)
- [Visualization Examples](./examples/visualizations/)
- [ML Integration Examples](./examples/ml-integration/)

### Support
- Create issues in the GitHub repository
- Check the troubleshooting guide
- Review the API documentation
- Contact the development team

---

**Note**: These advanced features are designed to enhance the ChainHawk Compliance Platform with enterprise-grade capabilities. Ensure proper testing and validation before deploying to production environments. 