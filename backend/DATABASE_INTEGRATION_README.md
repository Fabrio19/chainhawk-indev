# Database Integration for Bridge Transaction Storage

This document describes the enterprise-grade database integration for storing decoded bridge transactions in both PostgreSQL and Neo4j.

## 🏗️ Architecture Overview

The system uses a **dual-database approach**:
- **PostgreSQL**: Relational storage for structured transaction data and analytics
- **Neo4j**: Graph database for relationship analysis and path tracing

## 📊 PostgreSQL Schema

### Table: `bridge_flows`

```sql
CREATE TABLE bridge_flows (
    id BIGSERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    from_chain VARCHAR(50) NOT NULL,
    to_chain VARCHAR(50) NOT NULL,
    sender VARCHAR(42) NOT NULL,
    receiver VARCHAR(42) NOT NULL,
    token VARCHAR(20) NOT NULL,
    amount DECIMAL(65,18) NOT NULL,
    bridge VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Enterprise fields
    block_number BIGINT,
    gas_used BIGINT,
    gas_price DECIMAL(65,18),
    fee_amount DECIMAL(65,18),
    fee_token VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    risk_score DECIMAL(5,2),
    risk_flags TEXT[],
    metadata JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Features:
- **Unique constraints** on `tx_hash` to prevent duplicates
- **Comprehensive indexing** for optimal query performance
- **Data validation** with CHECK constraints
- **Automatic timestamps** with triggers
- **JSONB metadata** for flexible bridge-specific data

### Views:
- `high_risk_bridge_flows`: Transactions with risk score > 70 or amount > 1M
- `recent_bridge_flows`: Transactions from last 24 hours
- `bridge_statistics`: Aggregated statistics by bridge and chains

## 🕸️ Neo4j Graph Schema

### Nodes:
- **Wallet**: `{address: string}`
- **Transaction**: `{tx_hash, bridge, from_chain, to_chain, amount, token, timestamp}`

### Relationships:
- `(Wallet)-[:SENT {amount, token}]->(Wallet)`
- `(Wallet)-[:INITIATED]->(Transaction)`
- `(Wallet)-[:RECEIVED]->(Transaction)`

### Key Features:
- **MERGE operations** to prevent duplicate wallets
- **Rich relationship properties** for amount and token tracking
- **Bidirectional linking** for complete transaction tracing

## 🔧 Setup Instructions

### 1. Environment Configuration

Add these variables to your `.env` file:

```bash
# PostgreSQL Configuration
PGHOST=localhost
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=chainhawk
PGPORT=5432

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

### 2. Install Dependencies

```bash
npm install pg neo4j-driver
```

### 3. Run Database Migration

```bash
# Create the bridge_flows table
node run-migration.js
```

### 4. Test Database Integration

```bash
# Test both PostgreSQL and Neo4j connections
node test-db-integration.js
```

## 💻 Usage Examples

### Basic Transaction Saving

```javascript
const { saveBridgeTxToPostgres } = require('./src/services/pgClient');
const { saveBridgeTxToNeo4j } = require('./src/services/neo4jClient');

// Decoded bridge transaction
const decodedTx = {
    tx_hash: '0x1234...',
    from_chain: 'ethereum',
    to_chain: 'polygon',
    sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    receiver: '0x8ba1f109551bD432803012645Hac136c772c3c7c',
    token: 'USDC',
    amount: '1000000',
    bridge: 'stargate',
    timestamp: new Date().toISOString()
};

// Save to both databases
await saveBridgeTxToPostgres(decodedTx);
await saveBridgeTxToNeo4j(decodedTx);
```

### Bridge Module Integration

```javascript
// In your bridge watcher (e.g., stargate.js)
const { saveBridgeTxToPostgres } = require('../pgClient');
const { saveBridgeTxToNeo4j } = require('../neo4jClient');

contract.on('BridgeEvent', async (...args) => {
    const decodedTx = decodeBridgeEvent(args);
    
    try {
        // Save to both databases
        await Promise.all([
            saveBridgeTxToPostgres(decodedTx),
            saveBridgeTxToNeo4j(decodedTx)
        ]);
        
        console.log(`✅ Saved bridge tx ${decodedTx.tx_hash}`);
    } catch (error) {
        console.error(`❌ Failed to save tx ${decodedTx.tx_hash}:`, error);
    }
});
```

## 🔍 Query Examples

### PostgreSQL Queries

```sql
-- High-value transactions
SELECT * FROM bridge_flows 
WHERE amount > 1000000 
ORDER BY timestamp DESC;

-- Risk analysis by bridge
SELECT bridge, AVG(risk_score) as avg_risk, COUNT(*) as tx_count
FROM bridge_flows 
GROUP BY bridge 
ORDER BY avg_risk DESC;

-- Recent activity by wallet
SELECT * FROM bridge_flows 
WHERE sender = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
AND timestamp > NOW() - INTERVAL '24 hours';

-- Bridge volume statistics
SELECT * FROM bridge_statistics;
```

### Neo4j Queries

```cypher
-- Find all transactions for a wallet
MATCH (w:Wallet {address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'})-[r:SENT]->(receiver:Wallet)
RETURN w.address, receiver.address, r.amount, r.token;

-- Find transaction path (A -> B -> C)
MATCH path = (a:Wallet)-[:SENT*2..3]->(c:Wallet)
WHERE a.address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
RETURN path;

-- High-value transaction relationships
MATCH (sender:Wallet)-[r:SENT]->(receiver:Wallet)
WHERE r.amount > 1000000
RETURN sender.address, receiver.address, r.amount, r.token
ORDER BY r.amount DESC;

-- Bridge transaction analysis
MATCH (t:Transaction)
WHERE t.bridge = 'stargate'
RETURN t.from_chain, t.to_chain, COUNT(*) as tx_count, AVG(t.amount) as avg_amount
GROUP BY t.from_chain, t.to_chain;
```

## 🚀 Performance Optimizations

### PostgreSQL
- **Connection pooling** with max 10 connections
- **Comprehensive indexing** on all query patterns
- **Partial indexes** for high-value/high-risk transactions
- **JSONB indexing** for metadata queries

### Neo4j
- **Connection pooling** with max 10 connections
- **MERGE operations** to prevent duplicate nodes
- **Batch operations** for high-volume inserts
- **Session management** with proper cleanup

## 🔒 Security Considerations

### PostgreSQL
- **Parameterized queries** to prevent SQL injection
- **Input validation** with CHECK constraints
- **Connection encryption** (SSL/TLS)
- **Role-based access control**

### Neo4j
- **Parameterized Cypher queries**
- **Authentication** with username/password
- **Connection encryption** (bolt+ssc or bolt+s)
- **Session isolation**

## 📈 Monitoring and Maintenance

### Health Checks
```javascript
// PostgreSQL health check
const pgHealth = await pool.query('SELECT 1');

// Neo4j health check
const neo4jHealth = await session.run('RETURN 1 as test');
```

### Performance Monitoring
- Monitor query execution times
- Track connection pool usage
- Monitor disk space usage
- Set up alerts for high-risk transactions

### Backup Strategy
- **PostgreSQL**: Automated daily backups
- **Neo4j**: Regular graph exports
- **Point-in-time recovery** for compliance

## 🐛 Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify environment variables
   - Check database service status
   - Validate network connectivity

2. **Duplicate Key Errors**
   - Check for existing transactions
   - Verify UNIQUE constraints
   - Review transaction hash generation

3. **Performance Issues**
   - Monitor query execution plans
   - Check index usage
   - Optimize connection pooling

### Debug Commands

```bash
# Test PostgreSQL connection
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT 1;"

# Test Neo4j connection
cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD "RETURN 1 as test;"

# Check table structure
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "\d bridge_flows;"
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
- [Node.js pg Documentation](https://node-postgres.com/)
- [Neo4j JavaScript Driver](https://neo4j.com/docs/javascript-manual/current/)

---

**Enterprise Ready**: This implementation provides production-grade database integration with proper error handling, connection pooling, security, and performance optimizations. 