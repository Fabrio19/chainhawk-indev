-- CreateEnum
CREATE TYPE "BridgeProtocol" AS ENUM ('MULTICHAIN', 'STARGATE', 'WORMHOLE', 'SYNAPSE');

-- CreateEnum
CREATE TYPE "BridgeTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "bridge_transactions" (
    "id" UUID NOT NULL,
    "bridge_protocol" "BridgeProtocol" NOT NULL,
    "source_chain" TEXT NOT NULL,
    "destination_chain" TEXT NOT NULL,
    "source_address" TEXT NOT NULL,
    "destination_address" TEXT NOT NULL,
    "token_address" TEXT NOT NULL,
    "token_symbol" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "block_number" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "BridgeTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "risk_score" DOUBLE PRECISION,
    "risk_flags" JSONB,
    "metadata" JSONB,
    "linked_transaction_id" UUID,
    "analyzed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bridge_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bridge_transactions_bridge_protocol_idx" ON "bridge_transactions"("bridge_protocol");

-- CreateIndex
CREATE INDEX "bridge_transactions_source_chain_idx" ON "bridge_transactions"("source_chain");

-- CreateIndex
CREATE INDEX "bridge_transactions_destination_chain_idx" ON "bridge_transactions"("destination_chain");

-- CreateIndex
CREATE INDEX "bridge_transactions_source_address_idx" ON "bridge_transactions"("source_address");

-- CreateIndex
CREATE INDEX "bridge_transactions_destination_address_idx" ON "bridge_transactions"("destination_address");

-- CreateIndex
CREATE INDEX "bridge_transactions_token_address_idx" ON "bridge_transactions"("token_address");

-- CreateIndex
CREATE INDEX "bridge_transactions_transaction_hash_idx" ON "bridge_transactions"("transaction_hash");

-- CreateIndex
CREATE INDEX "bridge_transactions_status_idx" ON "bridge_transactions"("status");

-- CreateIndex
CREATE INDEX "bridge_transactions_risk_score_idx" ON "bridge_transactions"("risk_score");

-- CreateIndex
CREATE INDEX "bridge_transactions_timestamp_idx" ON "bridge_transactions"("timestamp");

-- CreateIndex
CREATE INDEX "bridge_transactions_created_at_idx" ON "bridge_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "bridge_transactions" ADD CONSTRAINT "bridge_transactions_linked_transaction_id_fkey" FOREIGN KEY ("linked_transaction_id") REFERENCES "bridge_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
