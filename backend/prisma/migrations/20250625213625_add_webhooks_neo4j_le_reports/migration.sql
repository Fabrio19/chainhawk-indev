/*
  Warnings:

  - You are about to drop the `Case` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Case" DROP CONSTRAINT "Case_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "CaseAction" DROP CONSTRAINT "CaseAction_case_id_fkey";

-- DropForeignKey
ALTER TABLE "Evidence" DROP CONSTRAINT "Evidence_case_id_fkey";

-- DropForeignKey
ALTER TABLE "STRReport" DROP CONSTRAINT "STRReport_case_id_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'analyst';

-- DropTable
DROP TABLE "Case";

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'New',
    "assigned_to" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" UUID NOT NULL,
    "last_triggered" TIMESTAMP(3),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "webhook_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response_status" INTEGER,
    "response_body" TEXT,
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "le_reports" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "report_type" TEXT NOT NULL,
    "pdf_path" TEXT NOT NULL,
    "report_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "sent_to" TEXT,
    "notes" TEXT,

    CONSTRAINT "le_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cases_wallet_address_idx" ON "cases"("wallet_address");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_assigned_to_idx" ON "cases"("assigned_to");

-- CreateIndex
CREATE INDEX "webhooks_user_id_idx" ON "webhooks"("user_id");

-- CreateIndex
CREATE INDEX "webhooks_is_active_idx" ON "webhooks"("is_active");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries"("webhook_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_event_type_idx" ON "webhook_deliveries"("event_type");

-- CreateIndex
CREATE INDEX "webhook_deliveries_created_at_idx" ON "webhook_deliveries"("created_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_success_idx" ON "webhook_deliveries"("success");

-- CreateIndex
CREATE INDEX "le_reports_case_id_idx" ON "le_reports"("case_id");

-- CreateIndex
CREATE INDEX "le_reports_report_type_idx" ON "le_reports"("report_type");

-- CreateIndex
CREATE INDEX "le_reports_status_idx" ON "le_reports"("status");

-- CreateIndex
CREATE INDEX "le_reports_generated_at_idx" ON "le_reports"("generated_at");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAction" ADD CONSTRAINT "CaseAction_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STRReport" ADD CONSTRAINT "STRReport_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "le_reports" ADD CONSTRAINT "le_reports_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
