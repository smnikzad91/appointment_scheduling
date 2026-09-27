-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('CASH', 'CARD_TO_CARD', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'SUPPLIES', 'SALARIES', 'UTILITIES', 'EQUIPMENT', 'MARKETING', 'OTHER');

-- AlterTable
ALTER TABLE "stylists" ADD COLUMN     "commissionPercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "chargedToman" INTEGER,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "stylistCommissionPercent" INTEGER,
ADD COLUMN     "stylistShareToman" INTEGER;

-- CreateTable
CREATE TABLE "stylist_payouts" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "stylistId" TEXT NOT NULL,
    "amountToman" INTEGER NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stylist_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salon_expenses" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amountToman" INTEGER NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salon_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stylist_payouts_salonId_paidAt_idx" ON "stylist_payouts"("salonId", "paidAt");

-- CreateIndex
CREATE INDEX "stylist_payouts_stylistId_paidAt_idx" ON "stylist_payouts"("stylistId", "paidAt");

-- CreateIndex
CREATE INDEX "salon_expenses_salonId_spentAt_idx" ON "salon_expenses"("salonId", "spentAt");

-- AddForeignKey
ALTER TABLE "stylist_payouts" ADD CONSTRAINT "stylist_payouts_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stylist_payouts" ADD CONSTRAINT "stylist_payouts_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salon_expenses" ADD CONSTRAINT "salon_expenses_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Appointments completed before accounting existed: book them at their booked price with no
-- stylist commission (commission percents start at 0; owners set them per stylist from now on).
UPDATE "appointments"
SET "chargedToman" = "priceToman", "stylistCommissionPercent" = 0, "stylistShareToman" = 0, "completedAt" = "updatedAt"
WHERE "status" = 'COMPLETED';

ALTER TABLE "stylists" ADD CONSTRAINT "stylists_commission_percent_range" CHECK ("commissionPercent" BETWEEN 0 AND 100);
ALTER TABLE "stylist_payouts" ADD CONSTRAINT "stylist_payouts_amount_positive" CHECK ("amountToman" > 0);
ALTER TABLE "salon_expenses" ADD CONSTRAINT "salon_expenses_amount_positive" CHECK ("amountToman" > 0);
