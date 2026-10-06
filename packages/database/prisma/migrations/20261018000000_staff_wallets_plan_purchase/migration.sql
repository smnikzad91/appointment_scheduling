-- AlterEnum
ALTER TYPE "PayoutMethod" ADD VALUE 'WALLET';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletTxKind" ADD VALUE 'PAYOUT_SENT';
ALTER TYPE "WalletTxKind" ADD VALUE 'PAYOUT_RECEIVED';
ALTER TYPE "WalletTxKind" ADD VALUE 'PLAN_PURCHASE';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "prepaymentStylistToman" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stylist_payouts" ADD COLUMN     "appointmentId" TEXT;

-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "payoutId" TEXT,
ADD COLUMN     "planPurchaseId" TEXT;

-- CreateTable
CREATE TABLE "plan_purchases" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "planId" TEXT,
    "planName" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "amountToman" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_purchases_salonId_createdAt_idx" ON "plan_purchases"("salonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stylist_payouts_appointmentId_key" ON "stylist_payouts"("appointmentId");

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "stylist_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_planPurchaseId_fkey" FOREIGN KEY ("planPurchaseId") REFERENCES "plan_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_purchases" ADD CONSTRAINT "plan_purchases_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_purchases" ADD CONSTRAINT "plan_purchases_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stylist_payouts" ADD CONSTRAINT "stylist_payouts_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

