-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'analyst', 'partner');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "SanctionsSource" AS ENUM ('OFAC', 'UN', 'EU', 'FIU_IND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('INDIVIDUAL', 'ENTITY', 'VESSEL', 'AIRCRAFT', 'WALLET', 'EXCHANGE', 'MIXER', 'DARKNET');

-- CreateEnum
CREATE TYPE "TraceStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('New', 'Investigating', 'Filed', 'Closed');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('KYC', 'ITR', 'Note', 'Screenshot');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "api_key_hash" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "api_key_id" UUID,
    "action_type" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "http_method" TEXT NOT NULL,
    "request_payload" JSONB,
    "response_status" INTEGER NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "permissions" JSONB NOT NULL,
    "last_used" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanctions_watchlist" (
    "id" UUID NOT NULL,
    "source" "SanctionsSource" NOT NULL,
    "entity_name" TEXT NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "wallet_address" TEXT,
    "chain" TEXT,
    "country" TEXT,
    "description" TEXT,
    "risk_level" TEXT,
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanctions_watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_traces" (
    "id" UUID NOT NULL,
    "trace_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "hops_json" JSONB NOT NULL,
    "risk_level" DOUBLE PRECISION NOT NULL,
    "risk_flags" JSONB NOT NULL,
    "status" "TraceStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "requested_by" UUID,

    CONSTRAINT "transaction_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "records_processed" INTEGER,
    "records_added" INTEGER,
    "records_updated" INTEGER,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "related_tx_hash" TEXT,
    "risk_score" INTEGER NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'New',
    "assigned_to" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAction" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" UUID NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "CaseAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "STRReport" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "pdf_path" TEXT NOT NULL,
    "pan" TEXT,
    "aadhaar" TEXT,
    "name" TEXT,
    "dob" TIMESTAMP(3),
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "STRReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletKYCLink" (
    "id" UUID NOT NULL,
    "wallet" TEXT NOT NULL,
    "kyc_id" UUID NOT NULL,
    "linked_by" TEXT NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletKYCLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_action_type_idx" ON "audit_log"("action_type");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "sanctions_watchlist_wallet_address_idx" ON "sanctions_watchlist"("wallet_address");

-- CreateIndex
CREATE INDEX "sanctions_watchlist_source_idx" ON "sanctions_watchlist"("source");

-- CreateIndex
CREATE INDEX "sanctions_watchlist_entity_type_idx" ON "sanctions_watchlist"("entity_type");

-- CreateIndex
CREATE INDEX "sanctions_watchlist_chain_idx" ON "sanctions_watchlist"("chain");

-- CreateIndex
CREATE INDEX "sanctions_watchlist_updated_at_idx" ON "sanctions_watchlist"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "sanctions_watchlist_source_entity_name_wallet_address_key" ON "sanctions_watchlist"("source", "entity_name", "wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_traces_trace_id_key" ON "transaction_traces"("trace_id");

-- CreateIndex
CREATE INDEX "transaction_traces_wallet_address_idx" ON "transaction_traces"("wallet_address");

-- CreateIndex
CREATE INDEX "transaction_traces_chain_idx" ON "transaction_traces"("chain");

-- CreateIndex
CREATE INDEX "transaction_traces_status_idx" ON "transaction_traces"("status");

-- CreateIndex
CREATE INDEX "transaction_traces_risk_level_idx" ON "transaction_traces"("risk_level");

-- CreateIndex
CREATE INDEX "transaction_traces_created_at_idx" ON "transaction_traces"("created_at");

-- CreateIndex
CREATE INDEX "sync_jobs_source_idx" ON "sync_jobs"("source");

-- CreateIndex
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");

-- CreateIndex
CREATE INDEX "sync_jobs_created_at_idx" ON "sync_jobs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "STRReport_pan_key" ON "STRReport"("pan");

-- CreateIndex
CREATE UNIQUE INDEX "STRReport_aadhaar_key" ON "STRReport"("aadhaar");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_traces" ADD CONSTRAINT "transaction_traces_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAction" ADD CONSTRAINT "CaseAction_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAction" ADD CONSTRAINT "CaseAction_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STRReport" ADD CONSTRAINT "STRReport_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletKYCLink" ADD CONSTRAINT "WalletKYCLink_kyc_id_fkey" FOREIGN KEY ("kyc_id") REFERENCES "STRReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
