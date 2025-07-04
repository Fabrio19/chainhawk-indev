-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL', 'BRIDGE_IN', 'BRIDGE_OUT');

-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'SUSPICIOUS');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('BRIDGE_TRANSFER', 'SIMILAR_PATTERN', 'TIME_PROXIMITY', 'AMOUNT_MATCH', 'ADDRESS_ASSOCIATION');

-- CreateEnum
CREATE TYPE "LinkConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('SANCTIONS_MATCH', 'HIGH_VALUE_TRANSFER', 'FREQUENT_BRIDGE_USAGE', 'SUSPICIOUS_PATTERN', 'MIXER_ASSOCIATION', 'DARKNET_ASSOCIATION', 'CIRCULAR_FLOW', 'RAPID_MOVEMENT', 'UNUSUAL_TIMING', 'KNOWN_SCAM');

-- CreateTable
CREATE TABLE "wallet_flows" (
    "id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "flow_type" "FlowType" NOT NULL,
    "token_address" TEXT NOT NULL,
    "token_symbol" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "block_number" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "FlowStatus" NOT NULL DEFAULT 'PENDING',
    "risk_score" DOUBLE PRECISION,
    "risk_flags" JSONB,
    "metadata" JSONB,
    "bridge_transaction_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detected_crosschain_links" (
    "id" UUID NOT NULL,
    "source_wallet_address" TEXT NOT NULL,
    "destination_wallet_address" TEXT NOT NULL,
    "source_chain" TEXT NOT NULL,
    "destination_chain" TEXT NOT NULL,
    "link_type" "LinkType" NOT NULL,
    "confidence" "LinkConfidence" NOT NULL DEFAULT 'MEDIUM',
    "token_address" TEXT NOT NULL,
    "token_symbol" TEXT NOT NULL,
    "total_amount" TEXT NOT NULL,
    "transaction_count" INTEGER NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "risk_score" DOUBLE PRECISION,
    "risk_flags" JSONB,
    "metadata" JSONB,
    "bridge_transaction_ids" UUID[],
    "wallet_flow_ids" UUID[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detected_crosschain_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_scores" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "risk_category" "RiskCategory" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BridgeTransactionToDetectedCrossChainLink" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_DetectedCrossChainLinkToWalletFlow" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE INDEX "wallet_flows_wallet_address_idx" ON "wallet_flows"("wallet_address");

-- CreateIndex
CREATE INDEX "wallet_flows_chain_idx" ON "wallet_flows"("chain");

-- CreateIndex
CREATE INDEX "wallet_flows_flow_type_idx" ON "wallet_flows"("flow_type");

-- CreateIndex
CREATE INDEX "wallet_flows_token_address_idx" ON "wallet_flows"("token_address");

-- CreateIndex
CREATE INDEX "wallet_flows_transaction_hash_idx" ON "wallet_flows"("transaction_hash");

-- CreateIndex
CREATE INDEX "wallet_flows_status_idx" ON "wallet_flows"("status");

-- CreateIndex
CREATE INDEX "wallet_flows_risk_score_idx" ON "wallet_flows"("risk_score");

-- CreateIndex
CREATE INDEX "wallet_flows_timestamp_idx" ON "wallet_flows"("timestamp");

-- CreateIndex
CREATE INDEX "wallet_flows_created_at_idx" ON "wallet_flows"("created_at");

-- CreateIndex
CREATE INDEX "detected_crosschain_links_source_wallet_address_idx" ON "detected_crosschain_links"("source_wallet_address");

-- CreateIndex
CREATE INDEX "detected_crosschain_links_destination_wallet_address_idx" ON "detected_crosschain_links"("destination_wallet_address");

-- CreateIndex
CREATE INDEX "detected_crosschain_links_source_chain_idx" ON "detected_crosschain_links"("source_chain");

-- CreateIndex
CREATE INDEX "detected_crosschain_links_destination_chain_idx" ON "detected_crosschain_links"("destination_chain");

-- CreateIndex
CREATE INDEX "detected_crosschain_links_link_type_idx" ON "detected_crosschain_links"("link_type");

-- CreateIndex
CREATE INDEX "detected_crosschain_links_confidence_idx" ON "detected_crosschain_links"("confidence");

-- CreateIndex
CREATE INDEX "detected_crosschain_links_risk_score_idx" ON "detected_crosschain_links"("risk_score");

-- CreateIndex
CREATE INDEX "detected_crosschain_links_first_seen_at_idx" ON "detected_crosschain_links"("first_seen_at");

-- CreateIndex
CREATE INDEX "detected_crosschain_links_created_at_idx" ON "detected_crosschain_links"("created_at");

-- CreateIndex
CREATE INDEX "risk_scores_entity_type_idx" ON "risk_scores"("entity_type");

-- CreateIndex
CREATE INDEX "risk_scores_entity_id_idx" ON "risk_scores"("entity_id");

-- CreateIndex
CREATE INDEX "risk_scores_risk_category_idx" ON "risk_scores"("risk_category");

-- CreateIndex
CREATE INDEX "risk_scores_score_idx" ON "risk_scores"("score");

-- CreateIndex
CREATE INDEX "risk_scores_created_at_idx" ON "risk_scores"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "_BridgeTransactionToDetectedCrossChainLink_AB_unique" ON "_BridgeTransactionToDetectedCrossChainLink"("A", "B");

-- CreateIndex
CREATE INDEX "_BridgeTransactionToDetectedCrossChainLink_B_index" ON "_BridgeTransactionToDetectedCrossChainLink"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DetectedCrossChainLinkToWalletFlow_AB_unique" ON "_DetectedCrossChainLinkToWalletFlow"("A", "B");

-- CreateIndex
CREATE INDEX "_DetectedCrossChainLinkToWalletFlow_B_index" ON "_DetectedCrossChainLinkToWalletFlow"("B");

-- AddForeignKey
ALTER TABLE "wallet_flows" ADD CONSTRAINT "wallet_flows_bridge_transaction_id_fkey" FOREIGN KEY ("bridge_transaction_id") REFERENCES "bridge_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BridgeTransactionToDetectedCrossChainLink" ADD CONSTRAINT "_BridgeTransactionToDetectedCrossChainLink_A_fkey" FOREIGN KEY ("A") REFERENCES "bridge_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BridgeTransactionToDetectedCrossChainLink" ADD CONSTRAINT "_BridgeTransactionToDetectedCrossChainLink_B_fkey" FOREIGN KEY ("B") REFERENCES "detected_crosschain_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DetectedCrossChainLinkToWalletFlow" ADD CONSTRAINT "_DetectedCrossChainLinkToWalletFlow_A_fkey" FOREIGN KEY ("A") REFERENCES "detected_crosschain_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DetectedCrossChainLinkToWalletFlow" ADD CONSTRAINT "_DetectedCrossChainLinkToWalletFlow_B_fkey" FOREIGN KEY ("B") REFERENCES "wallet_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
