/*
  Warnings:

  - You are about to drop the column `is_current` on the `audit_log` table. All the data in the column will be lost.
  - You are about to drop the column `previous_id` on the `audit_log` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `audit_log` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_previous_id_fkey";

-- DropIndex
DROP INDEX "audit_log_current_idx";

-- DropIndex
DROP INDEX "audit_log_endpoint_idx";

-- DropIndex
DROP INDEX "audit_log_ip_address_idx";

-- DropIndex
DROP INDEX "audit_log_user_action_idx";

-- DropIndex
DROP INDEX "audit_log_version_idx";

-- AlterTable
ALTER TABLE "audit_log" DROP COLUMN "is_current",
DROP COLUMN "previous_id",
DROP COLUMN "version";
