-- Migration: Create bridge_flows table for enterprise bridge transaction storage
-- This table stores all decoded bridge transactions for compliance and analytics

-- Create the bridge_flows table
CREATE TABLE IF NOT EXISTS bridge_flows (
    id BIGSERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL, -- Ethereum transaction hash (0x + 64 chars)
    from_chain VARCHAR(50) NOT NULL,     -- Source blockchain (ethereum, polygon, bsc, etc.)
    to_chain VARCHAR(50) NOT NULL,       -- Destination blockchain
    sender VARCHAR(42) NOT NULL,         -- Sender wallet address (0x + 40 chars)
    receiver VARCHAR(42) NOT NULL,       -- Receiver wallet address
    token VARCHAR(20) NOT NULL,          -- Token symbol (USDC, ETH, USDT, etc.)
    amount DECIMAL(65,18) NOT NULL,      -- Token amount (supports very large numbers)
    bridge VARCHAR(50) NOT NULL,         -- Bridge protocol (stargate, wormhole, cbridge, etc.)
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Additional fields for enterprise compliance
    block_number BIGINT,                 -- Block number on source chain
    gas_used BIGINT,                     -- Gas used for the transaction
    gas_price DECIMAL(65,18),            -- Gas price in wei
    fee_amount DECIMAL(65,18),           -- Bridge fee amount
    fee_token VARCHAR(20),               -- Fee token symbol
    status VARCHAR(20) DEFAULT 'pending', -- Transaction status (pending, completed, failed)
    risk_score DECIMAL(5,2),             -- Risk score (0.00 to 100.00)
    risk_flags TEXT[],                   -- Array of risk flags
    metadata JSONB,                      -- Additional bridge-specific data
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_bridge_flows_tx_hash ON bridge_flows(tx_hash);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_sender ON bridge_flows(sender);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_receiver ON bridge_flows(receiver);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_bridge ON bridge_flows(bridge);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_chains ON bridge_flows(from_chain, to_chain);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_timestamp ON bridge_flows(timestamp);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_amount ON bridge_flows(amount);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_risk_score ON bridge_flows(risk_score);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_status ON bridge_flows(status);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bridge_flows_sender_time ON bridge_flows(sender, timestamp);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_bridge_time ON bridge_flows(bridge, timestamp);
CREATE INDEX IF NOT EXISTS idx_bridge_flows_amount_time ON bridge_flows(amount, timestamp);

-- Create GIN index for JSONB metadata field
CREATE INDEX IF NOT EXISTS idx_bridge_flows_metadata ON bridge_flows USING GIN (metadata);

-- Create partial indexes for high-value transactions
CREATE INDEX IF NOT EXISTS idx_bridge_flows_high_value ON bridge_flows(timestamp, amount) 
WHERE amount > 1000000; -- Transactions over 1M

-- Create partial index for high-risk transactions
CREATE INDEX IF NOT EXISTS idx_bridge_flows_high_risk ON bridge_flows(timestamp, risk_score) 
WHERE risk_score > 70.0;

-- Add constraints for data integrity
ALTER TABLE bridge_flows 
ADD CONSTRAINT chk_bridge_flows_amount_positive CHECK (amount > 0),
ADD CONSTRAINT chk_bridge_flows_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100),
ADD CONSTRAINT chk_bridge_flows_status_valid CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
ADD CONSTRAINT chk_bridge_flows_tx_hash_format CHECK (tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
ADD CONSTRAINT chk_bridge_flows_address_format CHECK (
    sender ~ '^0x[a-fA-F0-9]{40}$' AND 
    receiver ~ '^0x[a-fA-F0-9]{40}$'
);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bridge_flows_updated_at 
    BEFORE UPDATE ON bridge_flows 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for high-risk transactions (for easy querying)
CREATE OR REPLACE VIEW high_risk_bridge_flows AS
SELECT * FROM bridge_flows 
WHERE risk_score > 70.0 OR amount > 1000000
ORDER BY timestamp DESC;

-- Create a view for recent transactions (last 24 hours)
CREATE OR REPLACE VIEW recent_bridge_flows AS
SELECT * FROM bridge_flows 
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Create a view for bridge statistics
CREATE OR REPLACE VIEW bridge_statistics AS
SELECT 
    bridge,
    from_chain,
    to_chain,
    COUNT(*) as transaction_count,
    SUM(amount) as total_volume,
    AVG(amount) as avg_amount,
    AVG(risk_score) as avg_risk_score,
    MIN(timestamp) as first_transaction,
    MAX(timestamp) as last_transaction
FROM bridge_flows 
GROUP BY bridge, from_chain, to_chain
ORDER BY total_volume DESC;

-- Add comments for documentation
COMMENT ON TABLE bridge_flows IS 'Stores all decoded bridge transactions for compliance monitoring and analytics';
COMMENT ON COLUMN bridge_flows.tx_hash IS 'Unique transaction hash from the source blockchain';
COMMENT ON COLUMN bridge_flows.amount IS 'Token amount in smallest unit (e.g., wei for ETH, satoshis for BTC)';
COMMENT ON COLUMN bridge_flows.risk_score IS 'Computed risk score from 0-100, higher means more risky';
COMMENT ON COLUMN bridge_flows.metadata IS 'JSON object containing bridge-specific transaction details';

-- Optional: Create partitioning for large-scale deployments
-- Uncomment and modify as needed for your volume requirements

/*
-- Example: Partition by month for high-volume deployments
CREATE TABLE bridge_flows_2024_01 PARTITION OF bridge_flows
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE bridge_flows_2024_02 PARTITION OF bridge_flows
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Continue for other months as needed
*/

-- Optional: Create archiving policy for old data
-- Uncomment and modify as needed

/*
-- Example: Archive data older than 1 year
CREATE TABLE bridge_flows_archive (LIKE bridge_flows INCLUDING ALL);

-- Create a function to archive old data
CREATE OR REPLACE FUNCTION archive_old_bridge_flows()
RETURNS void AS $$
BEGIN
    INSERT INTO bridge_flows_archive 
    SELECT * FROM bridge_flows 
    WHERE timestamp < NOW() - INTERVAL '1 year';
    
    DELETE FROM bridge_flows 
    WHERE timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Schedule archiving (requires pg_cron extension)
-- SELECT cron.schedule('archive-bridge-flows', '0 2 * * *', 'SELECT archive_old_bridge_flows();');
*/ 