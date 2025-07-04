const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  { maxConnectionPoolSize: 10 }
);

/**
 * Save a decoded bridge transaction to Neo4j
 * @param {Object} data - { tx_hash, from_chain, to_chain, sender, receiver, token, amount, bridge, timestamp }
 */
async function saveBridgeTxToNeo4j(data) {
  const session = driver.session();
  try {
    await session.writeTransaction(async tx => {
      await tx.run(`
        MERGE (sender:Wallet {address: $sender})
        MERGE (receiver:Wallet {address: $receiver})
        CREATE (t:Transaction {
          tx_hash: $tx_hash,
          bridge: $bridge,
          from_chain: $from_chain,
          to_chain: $to_chain,
          amount: $amount,
          token: $token,
          timestamp: $timestamp
        })
        MERGE (sender)-[:SENT {amount: $amount, token: $token}]->(receiver)
        MERGE (sender)-[:INITIATED]->(t)
        MERGE (receiver)-[:RECEIVED]->(t)
      `, {
        sender: data.sender,
        receiver: data.receiver,
        tx_hash: data.tx_hash,
        bridge: data.bridge,
        from_chain: data.from_chain,
        to_chain: data.to_chain,
        amount: data.amount,
        token: data.token,
        timestamp: data.timestamp
      });
    });
    console.log(`[Neo4j] Saved tx ${data.tx_hash}`);
  } catch (err) {
    console.error(`[Neo4j] Error saving tx ${data.tx_hash}:`, err.message);
  } finally {
    await session.close();
  }
}

module.exports = { saveBridgeTxToNeo4j, driver }; 