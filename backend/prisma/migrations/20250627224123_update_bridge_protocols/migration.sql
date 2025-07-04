/*
  Warnings:

  - The values [MULTICHAIN] on the enum `BridgeProtocol` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BridgeProtocol_new" AS ENUM ('STARGATE', 'WORMHOLE', 'SYNAPSE', 'CELER');
ALTER TABLE "bridge_transactions" ALTER COLUMN "bridge_protocol" TYPE "BridgeProtocol_new" USING ("bridge_protocol"::text::"BridgeProtocol_new");
ALTER TYPE "BridgeProtocol" RENAME TO "BridgeProtocol_old";
ALTER TYPE "BridgeProtocol_new" RENAME TO "BridgeProtocol";
DROP TYPE "BridgeProtocol_old";
COMMIT;
