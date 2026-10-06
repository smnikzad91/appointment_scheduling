-- Salon subscriptions: plan + end date per salon, and monthly reminder-SMS usage.
-- AlterTable
ALTER TABLE "salons" ADD COLUMN     "planExpiresAt" TIMESTAMP(3),
ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "salon_sms_usage" (
    "salonId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "salon_sms_usage_pkey" PRIMARY KEY ("salonId","period")
);

-- AddForeignKey
ALTER TABLE "salons" ADD CONSTRAINT "salons_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salon_sms_usage" ADD CONSTRAINT "salon_sms_usage_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

