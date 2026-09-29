-- A stylist's own work costs (stylist panel), subtracted from their share for net income.
-- CreateEnum
CREATE TYPE "StylistExpenseCategory" AS ENUM ('SUPPLIES', 'PRODUCTS', 'TOOLS', 'TRAINING', 'TRANSPORT', 'OTHER');

-- CreateTable
CREATE TABLE "stylist_expenses" (
    "id" TEXT NOT NULL,
    "stylistId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "category" "StylistExpenseCategory" NOT NULL,
    "amountToman" INTEGER NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stylist_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stylist_expenses_stylistId_spentAt_idx" ON "stylist_expenses"("stylistId", "spentAt");

-- CreateIndex
CREATE INDEX "stylist_expenses_salonId_idx" ON "stylist_expenses"("salonId");

-- AddForeignKey
ALTER TABLE "stylist_expenses" ADD CONSTRAINT "stylist_expenses_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stylist_expenses" ADD CONSTRAINT "stylist_expenses_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

