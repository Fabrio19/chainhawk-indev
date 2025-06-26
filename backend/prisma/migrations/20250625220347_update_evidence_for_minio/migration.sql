/*
  Warnings:

  - You are about to drop the `Evidence` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Evidence" DROP CONSTRAINT "Evidence_case_id_fkey";

-- DropForeignKey
ALTER TABLE "Evidence" DROP CONSTRAINT "Evidence_uploaded_by_fkey";

-- DropTable
DROP TABLE "Evidence";

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content_type" TEXT,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_case_id_idx" ON "evidence"("case_id");

-- CreateIndex
CREATE INDEX "evidence_file_type_idx" ON "evidence"("file_type");

-- CreateIndex
CREATE INDEX "evidence_uploaded_at_idx" ON "evidence"("uploaded_at");

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
