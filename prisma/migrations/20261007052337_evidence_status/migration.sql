-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Evidence_credentialId_status_idx" ON "Evidence"("credentialId", "status");
