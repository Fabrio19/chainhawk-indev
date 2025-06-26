const neo4j = require('neo4j-driver');

/**
 * Neo4j Service
 * Handles deep transaction tracing and graph analysis for blockchain compliance
 */

class Neo4jService {
  constructor() {
    this.driver = null;
    this.session = null;
    this.isConnected = false;
  }

  /**
   * Initialize Neo4j connection
   */
  async connect() {
    try {
      const uri = process.env.NEO4J_URI || "neo4j://localhost:7687";
      const user = process.env.NEO4J_USER || "neo4j";
      const password = process.env.NEO4J_PASSWORD || "password";

      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
      
      // Test connection
      await this.driver.verifyConnectivity();
      this.isConnected = true;
      
      console.log("✅ Connected to Neo4j database");
      
      // Create constraints and indexes
      await this.createConstraints();
      
    } catch (error) {
      console.error("❌ Failed to connect to Neo4j:", error.message);
      this.isConnected = false;
    }
  }

  /**
   * Create database constraints and indexes
   */
  async createConstraints() {
    try {
      const session = this.driver.session();
      
      // Create constraints for unique properties
      await session.run("CREATE CONSTRAINT wallet_address IF NOT EXISTS FOR (w:Wallet) REQUIRE w.address IS UNIQUE");
      await session.run("CREATE CONSTRAINT transaction_hash IF NOT EXISTS FOR (t:Transaction) REQUIRE t.hash IS UNIQUE");
      await session.run("CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE");
      
      // Create indexes for better performance
      await session.run("CREATE INDEX wallet_chain IF NOT EXISTS FOR (w:Wallet) ON (w.chain)");
      await session.run("CREATE INDEX transaction_timestamp IF NOT EXISTS FOR (t:Transaction) ON (t.timestamp)");
      await session.run("CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)");
      
      await session.close();
      console.log("✅ Neo4j constraints and indexes created");
    } catch (error) {
      console.error("❌ Failed to create Neo4j constraints:", error.message);
    }
  }

  /**
   * Add wallet node to graph
   */
  async addWallet(walletData) {
    if (!this.isConnected) return;

    try {
      const session = this.driver.session();
      
      const query = `
        MERGE (w:Wallet {address: $address})
        SET w.chain = $chain,
            w.balance = $balance,
            w.riskScore = $riskScore,
            w.lastActivity = $lastActivity,
            w.labels = $labels,
            w.isBlacklisted = $isBlacklisted,
            w.entityType = $entityType,
            w.updatedAt = datetime()
        RETURN w
      `;

      const result = await session.run(query, {
        address: walletData.address,
        chain: walletData.chain,
        balance: walletData.balance,
        riskScore: walletData.riskScore,
        lastActivity: walletData.lastActivity,
        labels: walletData.labels,
        isBlacklisted: walletData.isBlacklisted,
        entityType: walletData.entityType,
      });

      await session.close();
      return result.records[0]?.get("w");
    } catch (error) {
      console.error("Error adding wallet to Neo4j:", error);
    }
  }

  /**
   * Add transaction node and relationships
   */
  async addTransaction(transactionData) {
    if (!this.isConnected) return;

    try {
      const session = this.driver.session();
      
      const query = `
        MATCH (from:Wallet {address: $fromAddress})
        MATCH (to:Wallet {address: $toAddress})
        MERGE (t:Transaction {hash: $hash})
        SET t.amount = $amount,
            t.currency = $currency,
            t.timestamp = $timestamp,
            t.chain = $chain,
            t.blockNumber = $blockNumber,
            t.gasUsed = $gasUsed,
            t.riskFlags = $riskFlags,
            t.category = $category,
            t.updatedAt = datetime()
        MERGE (from)-[r1:SENT]->(t)
        MERGE (t)-[r2:RECEIVED]->(to)
        RETURN t, from, to
      `;

      const result = await session.run(query, {
        hash: transactionData.hash,
        fromAddress: transactionData.from,
        toAddress: transactionData.to,
        amount: transactionData.amount,
        currency: transactionData.currency,
        timestamp: transactionData.timestamp,
        chain: transactionData.chain,
        blockNumber: transactionData.blockNumber,
        gasUsed: transactionData.gasUsed,
        riskFlags: transactionData.riskFlags,
        category: transactionData.category,
      });

      await session.close();
      return result.records[0];
    } catch (error) {
      console.error("Error adding transaction to Neo4j:", error);
    }
  }

  /**
   * Add entity (exchange, mixer, etc.) to graph
   */
  async addEntity(entityData) {
    if (!this.isConnected) return;

    try {
      const session = this.driver.session();
      
      const query = `
        MERGE (e:Entity {id: $id})
        SET e.name = $name,
            e.type = $type,
            e.address = $address,
            e.chain = $chain,
            e.riskLevel = $riskLevel,
            e.description = $description,
            e.metadata = $metadata,
            e.updatedAt = datetime()
        RETURN e
      `;

      const result = await session.run(query, {
        id: entityData.id,
        name: entityData.name,
        type: entityData.type,
        address: entityData.address,
        chain: entityData.chain,
        riskLevel: entityData.riskLevel,
        description: entityData.description,
        metadata: entityData.metadata,
      });

      await session.close();
      return result.records[0]?.get("e");
    } catch (error) {
      console.error("Error adding entity to Neo4j:", error);
    }
  }

  /**
   * Link wallet to entity
   */
  async linkWalletToEntity(walletAddress, entityId, relationshipType = "BELONGS_TO") {
    if (!this.isConnected) return;

    try {
      const session = this.driver.session();
      
      const query = `
        MATCH (w:Wallet {address: $walletAddress})
        MATCH (e:Entity {id: $entityId})
        MERGE (w)-[r:${relationshipType}]->(e)
        SET r.linkedAt = datetime()
        RETURN w, e, r
      `;

      const result = await session.run(query, {
        walletAddress,
        entityId,
      });

      await session.close();
      return result.records[0];
    } catch (error) {
      console.error("Error linking wallet to entity:", error);
    }
  }

  /**
   * Deep transaction tracing with path analysis
   */
  async traceTransactionPath(startAddress, maxDepth = 5, maxPaths = 10) {
    if (!this.isConnected) return null;

    try {
      const session = this.driver.session();
      
      const query = `
        MATCH path = (start:Wallet {address: $startAddress})-[*1..${maxDepth}]-(related:Wallet)
        WHERE start <> related
        WITH path, 
             length(path) as pathLength,
             [node IN nodes(path) WHERE node:Wallet] as wallets,
             [rel IN relationships(path)] as relationships
        RETURN path,
               pathLength,
               wallets,
               relationships,
               [wallet IN wallets | wallet.riskScore] as riskScores
        ORDER BY pathLength ASC, 
                 reduce(score = 0, s IN [wallet IN wallets | wallet.riskScore] | score + s) DESC
        LIMIT ${maxPaths}
      `;

      const result = await session.run(query, { startAddress });
      
      const paths = result.records.map(record => ({
        path: record.get("path"),
        length: record.get("pathLength").toNumber(),
        wallets: record.get("wallets"),
        relationships: record.get("relationships"),
        riskScores: record.get("riskScores"),
        totalRisk: record.get("riskScores").reduce((sum, score) => sum + score, 0),
      }));

      await session.close();
      return paths;
    } catch (error) {
      console.error("Error tracing transaction path:", error);
      return null;
    }
  }

  /**
   * Find high-risk transaction patterns
   */
  async findHighRiskPatterns(riskThreshold = 70) {
    if (!this.isConnected) return null;

    try {
      const session = this.driver.session();
      
      const query = `
        MATCH (w:Wallet)
        WHERE w.riskScore >= $riskThreshold
        WITH w
        MATCH path = (w)-[r:SENT|RECEIVED*1..3]-(related:Wallet)
        WHERE w <> related
        WITH w, related, path,
             [node IN nodes(path) WHERE node:Wallet] as pathWallets
        WHERE any(wallet IN pathWallets WHERE wallet.riskScore >= $riskThreshold)
        RETURN w.address as sourceWallet,
               related.address as relatedWallet,
               w.riskScore as sourceRisk,
               related.riskScore as relatedRisk,
               length(path) as pathLength,
               [wallet IN pathWallets | wallet.address] as pathAddresses
        ORDER BY sourceRisk + relatedRisk DESC
        LIMIT 50
      `;

      const result = await session.run(query, { riskThreshold });
      
      const patterns = result.records.map(record => ({
        sourceWallet: record.get("sourceWallet"),
        relatedWallet: record.get("relatedWallet"),
        sourceRisk: record.get("sourceRisk"),
        relatedRisk: record.get("relatedRisk"),
        pathLength: record.get("pathLength").toNumber(),
        pathAddresses: record.get("pathAddresses"),
        totalRisk: record.get("sourceRisk") + record.get("relatedRisk"),
      }));

      await session.close();
      return patterns;
    } catch (error) {
      console.error("Error finding high-risk patterns:", error);
      return null;
    }
  }

  /**
   * Get wallet cluster analysis
   */
  async getWalletCluster(walletAddress, clusterRadius = 2) {
    if (!this.isConnected) return null;

    try {
      const session = this.driver.session();
      
      const query = `
        MATCH (start:Wallet {address: $walletAddress})
        CALL gds.bfs.stream('wallet-graph', {
          sourceNode: id(start),
          maxDepth: $clusterRadius
        })
        YIELD path
        WITH path, [node IN nodes(path)] as clusterNodes
        UNWIND clusterNodes as node
        RETURN DISTINCT node.address as address,
               node.riskScore as riskScore,
               node.chain as chain,
               node.entityType as entityType,
               node.labels as labels
        ORDER BY node.riskScore DESC
      `;

      const result = await session.run(query, { 
        walletAddress, 
        clusterRadius 
      });
      
      const cluster = result.records.map(record => ({
        address: record.get("address"),
        riskScore: record.get("riskScore"),
        chain: record.get("chain"),
        entityType: record.get("entityType"),
        labels: record.get("labels"),
      }));

      await session.close();
      return cluster;
    } catch (error) {
      console.error("Error getting wallet cluster:", error);
      return null;
    }
  }

  /**
   * Analyze money flow patterns
   */
  async analyzeMoneyFlow(sourceAddress, targetAddress, maxHops = 5) {
    if (!this.isConnected) return null;

    try {
      const session = this.driver.session();
      
      const query = `
        MATCH path = (source:Wallet {address: $sourceAddress})-[r:SENT*1..${maxHops}]->(target:Wallet {address: $targetAddress})
        WITH path,
             [node IN nodes(path) WHERE node:Wallet] as intermediateWallets,
             [rel IN relationships(path)] as transactions
        RETURN path,
               length(path) as hopCount,
               intermediateWallets,
               transactions,
               [wallet IN intermediateWallets | wallet.riskScore] as riskScores,
               reduce(total = 0, tx IN transactions | total + tx.amount) as totalAmount
        ORDER BY hopCount ASC, totalAmount DESC
        LIMIT 10
      `;

      const result = await session.run(query, { 
        sourceAddress, 
        targetAddress 
      });
      
      const flows = result.records.map(record => ({
        path: record.get("path"),
        hopCount: record.get("hopCount").toNumber(),
        intermediateWallets: record.get("intermediateWallets"),
        transactions: record.get("transactions"),
        riskScores: record.get("riskScores"),
        totalAmount: record.get("totalAmount"),
        averageRisk: record.get("riskScores").reduce((sum, score) => sum + score, 0) / record.get("riskScores").length,
      }));

      await session.close();
      return flows;
    } catch (error) {
      console.error("Error analyzing money flow:", error);
      return null;
    }
  }

  /**
   * Get graph statistics
   */
  async getGraphStats() {
    if (!this.isConnected) return null;

    try {
      const session = this.driver.session();
      
      const queries = [
        "MATCH (w:Wallet) RETURN count(w) as walletCount",
        "MATCH (t:Transaction) RETURN count(t) as transactionCount",
        "MATCH (e:Entity) RETURN count(e) as entityCount",
        "MATCH (w:Wallet) WHERE w.riskScore >= 70 RETURN count(w) as highRiskWallets",
        "MATCH (w:Wallet)-[r:SENT]->(t:Transaction) RETURN count(r) as sentTransactions",
        "MATCH (w:Wallet)-[r:RECEIVED]->(t:Transaction) RETURN count(r) as receivedTransactions",
        "MATCH (w:Wallet) WHERE w.isBlacklisted = true RETURN count(w) as blacklistedWallets",
      ];

      const stats = {};
      
      for (const query of queries) {
        const result = await session.run(query);
        const key = Object.keys(result.records[0].toObject())[0];
        stats[key] = result.records[0].get(key).toNumber();
      }

      await session.close();
      return stats;
    } catch (error) {
      console.error("Error getting graph stats:", error);
      return null;
    }
  }

  /**
   * Close Neo4j connection
   */
  async close() {
    if (this.driver) {
      await this.driver.close();
      this.isConnected = false;
      console.log("✅ Neo4j connection closed");
    }
  }
}

// Create singleton instance
const neo4jService = new Neo4jService();

module.exports = neo4jService; 