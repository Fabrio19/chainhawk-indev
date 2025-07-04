-- Real-Time Bridge Monitoring Schema
-- New tables for real-time bridge event tracking

-- Bridge Events Table - Stores real-time bridge events
CREATE TABLE IF NOT EXISTS bridge_events (
  id SERIAL PRIMARY KEY,
  src_chain TEXT NOT NULL,
  dst_chain TEXT NOT NULL,
  bridge TEXT NOT NULL,
  event TEXT NOT NULL,
  args JSONB NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT 0,
  UNIQUE(tx_hash, bridge)
);

-- Cross Chain Links Table - Links related transactions across chains
CREATE TABLE IF NOT EXISTS cross_chain_links (
  id SERIAL PRIMARY KEY,
  src_tx_hash TEXT NOT NULL,
  dst_tx_hash TEXT,
  src_chain TEXT NOT NULL,
  dst_chain TEXT NOT NULL,
  token TEXT,
  amount NUMERIC,
  confidence REAL DEFAULT 1.0,
  detected_at TIMESTAMP DEFAULT NOW(),
  bridge_protocol TEXT NOT NULL,
  risk_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bridge_events_tx_hash ON bridge_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_bridge_events_bridge ON bridge_events(bridge);
CREATE INDEX IF NOT EXISTS idx_bridge_events_timestamp ON bridge_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_bridge_events_processed ON bridge_events(processed);

CREATE INDEX IF NOT EXISTS idx_cross_chain_links_src_tx ON cross_chain_links(src_tx_hash);
CREATE INDEX IF NOT EXISTS idx_cross_chain_links_dst_tx ON cross_chain_links(dst_tx_hash);
CREATE INDEX IF NOT EXISTS idx_cross_chain_links_bridge ON cross_chain_links(bridge_protocol);
CREATE INDEX IF NOT EXISTS idx_cross_chain_links_detected ON cross_chain_links(detected_at);

-- Add comments for documentation
COMMENT ON TABLE bridge_events IS 'Real-time bridge events from blockchain monitoring';
COMMENT ON TABLE cross_chain_links IS 'Cross-chain transaction links detected by bridge monitoring'; 