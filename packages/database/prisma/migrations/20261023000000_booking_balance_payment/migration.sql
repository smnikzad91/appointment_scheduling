-- CreateEnum
CREATE TYPE "BalanceMethod" AS ENUM ('ON_SITE', 'WALLET');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BALANCE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'BALANCE_PAID';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletTxKind" ADD VALUE 'BALANCE_PAYMENT';
ALTER TYPE "WalletTxKind" ADD VALUE 'BALANCE_INCOME';
ALTER TYPE "WalletTxKind" ADD VALUE 'BALANCE_INCOME_REVERSAL';
ALTER TYPE "WalletTxKind" ADD VALUE 'BALANCE_REFUND';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "balanceDueToman" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "balanceMethod" "BalanceMethod",
ADD COLUMN     "balancePaidAt" TIMESTAMP(3),
ADD COLUMN     "balancePayoutId" TEXT,
ADD COLUMN     "balanceStylistToman" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_balancePayoutId_key" ON "appointments"("balancePayoutId");

