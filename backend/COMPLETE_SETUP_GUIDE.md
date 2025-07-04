# 🚀 ChainHawk Complete Database Integration Setup Guide

This guide will walk you through setting up the complete ChainHawk Bridge Monitoring System with PostgreSQL and Neo4j database integration.

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **Neo4j** (v4 or higher)
- **PowerShell** (for Windows users)

## 🗄️ Database Setup

### 1. PostgreSQL Setup

1. **Install PostgreSQL** (if not already installed)
   - Download from: https://www.postgresql.org/download/
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`

2. **Create Database and User**
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Create database
   CREATE DATABASE chainhawk;
   
   -- Create user
   CREATE USER chainhawk_user WITH PASSWORD 'your_secure_password';
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE chainhawk TO chainhawk_user;
   
   -- Connect to chainhawk database
   \c chainhawk
   
   -- Grant schema privileges
   GRANT ALL ON SCHEMA public TO chainhawk_user;
   ```

### 2. Neo4j Setup

1. **Install Neo4j** (if not already installed)
   - Download Neo4j Desktop: https://neo4j.com/download/
   - Or use Docker: `docker run --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password -d neo4j:latest`

2. **Create Database**
   - Open Neo4j Browser (http://localhost:7474)
   - Login with username: `neo4j` and your password
   - Create a new database or use the default

## 🔧 Environment Configuration

### 1. Create Environment File

1. **Copy the template**:
   ```bash
   cd backend
   copy env.example .env
   ```

2. **Edit `.env` file** with your database credentials:
   ```bash
   # PostgreSQL Configuration
   PGHOST=localhost
   PGUSER=chainhawk_user
   PGPASSWORD=your_secure_password
   PGDATABASE=chainhawk
   PGPORT=5432

   # Neo4j Configuration
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_neo4j_password
   ```

### 2. Configure Blockchain RPCs (Optional)

Add your blockchain RPC URLs to the `.env` file:
   ```bash
   # Ethereum Mainnet
   ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
   
   # BSC
   BSC_RPC_URL=https://bsc-dataseed1.binance.org/
   
   # Polygon
   POLYGON_RPC_URL=https://polygon-rpc.com/
   ```

## 🚀 Automated Setup

### Option 1: PowerShell Script (Windows)

Run the automated setup script:
```powershell
cd backend
.\setup-complete-integration.ps1
```

### Option 2: Manual Setup

Follow these steps manually:

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install pg neo4j-driver dotenv ethers
   ```

2. **Run Database Migration**:
   ```bash
   node run-migration.js
   ```

3. **Test Database Integration**:
   ```bash
   node test-db-integration.js
   ```

4. **Test Bridge Modules**:
   ```bash
   node test-modular-bridges.js
   ```

5. **Test Enhanced Features**:
   ```bash
   node test-enhanced-features.js
   ```

## 🧪 Verification

### 1. Database Connection Test

Run the database integration test:
```bash
node test-db-integration.js
```

Expected output:
```
🧪 Testing Database Integration (PostgreSQL + Neo4j)
==================================================

1️⃣ Testing PostgreSQL Connection...
✅ PostgreSQL connection successful
✅ bridge_flows table exists

2️⃣ Testing Neo4j Connection...
✅ Neo4j connection successful

3️⃣ Testing PostgreSQL Save Function...
✅ Transaction saved to PostgreSQL

4️⃣ Testing Neo4j Save Function...
✅ Transaction saved to Neo4j

5️⃣ Testing Neo4j Graph Relationships...
✅ SENT relationship created

6️⃣ Testing Duplicate Transaction Handling...
✅ PostgreSQL duplicate handling working (no duplicates)

7️⃣ Testing Performance (10 transactions)...
✅ Performance test completed in XXXms

🎉 Database Integration Test Completed Successfully!
```

### 2. Bridge Module Test

Test the bridge monitoring system:
```bash
node test-modular-bridges.js
```

### 3. Enhanced Features Test

Test notifications, CSV export, and risk scoring:
```bash
node test-enhanced-features.js
```

## 🏃‍♂️ Running the System

### 1. Start Bridge Monitoring

```bash
# Start the main bridge monitoring system
node main.js

# Or start with enhanced monitoring
node start-enhanced-monitoring.js
```

### 2. Start Frontend (Optional)

```bash
# From the root directory
cd ..
npm run dev
```

Access the frontend at: http://localhost:5173

## 📊 Database Schema

### PostgreSQL Tables

**`bridge_flows`** - Main transaction table:
- `id` - Primary key
- `tx_hash` - Transaction hash (unique)
- `from_chain` - Source blockchain
- `to_chain` - Destination blockchain
- `sender` - Sender wallet address
- `receiver` - Receiver wallet address
- `token` - Token symbol
- `amount` - Transaction amount
- `bridge` - Bridge protocol name
- `timestamp` - Transaction timestamp
- `risk_score` - Computed risk score
- `metadata` - Additional bridge-specific data

**Views**:
- `high_risk_bridge_flows` - High-risk transactions
- `recent_bridge_flows` - Recent transactions (24h)
- `bridge_statistics` - Aggregated statistics

### Neo4j Graph Schema

**Nodes**:
- `Wallet` - Wallet addresses
- `Transaction` - Bridge transactions

**Relationships**:
- `(Wallet)-[:SENT {amount, token}]->(Wallet)`
- `(Wallet)-[:INITIATED]->(Transaction)`
- `(Wallet)-[:RECEIVED]->(Transaction)`

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
```

## 🚨 Monitoring and Alerts

### 1. High-Risk Transaction Alerts

The system automatically detects and alerts on:
- Transactions above ₹10L threshold
- High risk scores (≥70%)
- Sanctions matches
- Suspicious patterns

### 2. CSV Export

Transactions are automatically exported to CSV every hour in the `./exports` directory.

### 3. Loop Detection

The system detects circular transaction patterns (A→B→C→A) for compliance monitoring.

## 🔧 Troubleshooting

### Common Issues

1. **PostgreSQL Connection Error**
   - Verify PostgreSQL is running
   - Check credentials in `.env` file
   - Ensure database and user exist

2. **Neo4j Connection Error**
   - Verify Neo4j is running on port 7687
   - Check credentials in `.env` file
   - Ensure Neo4j is accessible

3. **Migration Errors**
   - Check PostgreSQL permissions
   - Verify database exists
   - Check for existing tables

4. **Bridge Module Errors**
   - Verify RPC URLs are correct
   - Check network connectivity
   - Ensure contract addresses are valid

### Debug Commands

```bash
# Test PostgreSQL connection
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT 1;"

# Test Neo4j connection
cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD "RETURN 1 as test;"

# Check table structure
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "\d bridge_flows;"

# View recent transactions
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT * FROM recent_bridge_flows LIMIT 10;"
```

## 📚 Additional Resources

- **DATABASE_INTEGRATION_README.md** - Detailed database documentation
- **ENHANCED_FEATURES_README.md** - Enhanced monitoring features
- **MODULAR_BRIDGE_SYSTEM.md** - Bridge monitoring system overview
- **BRIDGE_MONITORING_README.md** - Bridge monitoring setup

## 🎯 Success Criteria

Your setup is complete when:

✅ PostgreSQL migration runs successfully  
✅ Neo4j connection test passes  
✅ Database integration test passes  
✅ Bridge modules can be initialized  
✅ Enhanced features test passes  
✅ All required files are present  

## 🚀 Next Steps

1. **Configure RPC URLs** for live blockchain monitoring
2. **Set up notifications** (Telegram/Discord) for alerts
3. **Configure risk thresholds** for your compliance needs
4. **Start monitoring** with `node main.js`
5. **Access the frontend** for visual monitoring

---

**🎉 Congratulations! Your ChainHawk Bridge Monitoring System is now ready for enterprise-grade compliance monitoring.** 