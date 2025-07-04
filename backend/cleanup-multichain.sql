-- Clean up MULTICHAIN data before updating BridgeProtocol enum
-- Using the correct column names from Prisma schema mapping

-- First, check if there are any MULTICHAIN records
SELECT COUNT(*) as multichain_count FROM bridge_transactions WHERE "bridge_protocol" = 'MULTICHAIN';

-- Delete MULTICHAIN bridge transactions
DELETE FROM bridge_transactions WHERE "bridge_protocol" = 'MULTICHAIN';

-- Delete related wallet flows
DELETE FROM wallet_flows WHERE "bridge_transaction_id" IN (
  SELECT id FROM bridge_transactions WHERE "bridge_protocol" = 'MULTICHAIN'
);

-- Clean up cross-chain links that reference MULTICHAIN transactions
-- Convert UUID array to text array for comparison
UPDATE detected_crosschain_links 
SET "bridge_transaction_ids" = array_remove("bridge_transaction_ids", 
  (SELECT id FROM bridge_transactions WHERE "bridge_protocol" = 'MULTICHAIN' LIMIT 1)
) WHERE "bridge_transaction_ids" && ARRAY(
  SELECT id FROM bridge_transactions WHERE "bridge_protocol" = 'MULTICHAIN'
)::uuid[];

-- Delete cross-chain links that have no remaining bridge transactions
DELETE FROM detected_crosschain_links WHERE array_length("bridge_transaction_ids", 1) = 0;

-- Verify cleanup
SELECT COUNT(*) as remaining_transactions FROM bridge_transactions;
SELECT COUNT(*) as remaining_wallet_flows FROM wallet_flows;
SELECT COUNT(*) as remaining_crosschain_links FROM detected_crosschain_links; 