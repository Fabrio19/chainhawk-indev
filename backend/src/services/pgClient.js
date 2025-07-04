const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
  max: 10, // pool size
  idleTimeoutMillis: 30000,
});

/**
 * Save a decoded bridge transaction to PostgreSQL (bridge_flows table)
 * @param {Object} data - { tx_hash, from_chain, to_chain, sender, receiver, token, amount, bridge, timestamp }
 */
async function saveBridgeTxToPostgres(data) {
  const query = `INSERT INTO bridge_flows
    (tx_hash, from_chain, to_chain, sender, receiver, token, amount, bridge, timestamp)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (tx_hash) DO NOTHING`;
  const values = [
    data.tx_hash,
    data.from_chain,
    data.to_chain,
    data.sender,
    data.receiver,
    data.token,
    data.amount,
    data.bridge,
    data.timestamp
  ];
  try {
    await pool.query(query, values);
    console.log(`[Postgres] Saved tx ${data.tx_hash}`);
  } catch (err) {
    console.error(`[Postgres] Error saving tx ${data.tx_hash}:`, err.message);
  }
}

module.exports = { saveBridgeTxToPostgres, pool }; 