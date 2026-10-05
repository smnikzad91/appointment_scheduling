-- CreateEnum
CREATE TYPE "WalletTxKind" AS ENUM ('TOP_UP', 'PREPAYMENT', 'PREPAYMENT_REFUND', 'PREPAYMENT_INCOME', 'PREPAYMENT_INCOME_REVERSAL');

-- CreateEnum
CREATE TYPE "PrepaymentStatus" AS ENUM ('HELD', 'SETTLED', 'REFUNDED');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "prepaidToman" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prepaymentStatus" "PrepaymentStatus";

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "WalletTxKind" NOT NULL,
    "amountToman" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "appointmentId" TEXT,
    "topUpId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_topUpId_key" ON "wallet_transactions"("topUpId");

-- CreateIndex
CREATE INDEX "wallet_transactions_userId_createdAt_idx" ON "wallet_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_transactions_appointmentId_idx" ON "wallet_transactions"("appointmentId");

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_topUpId_fkey" FOREIGN KEY ("topUpId") REFERENCES "wallet_top_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

