-- Invited stylists wait for the platform admin's approval; everyone already there counts as approved.
CREATE TYPE "StylistApproval" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "stylists" ADD COLUMN "approval" "StylistApproval" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "approvalDecidedAt" TIMESTAMP(3);

CREATE INDEX "stylists_approval_idx" ON "stylists"("approval");
