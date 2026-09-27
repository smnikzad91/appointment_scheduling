-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'NEW_BOOKING';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_RECORDED';

-- AlterTable
ALTER TABLE "stylist_services" ADD COLUMN     "commissionPercent" INTEGER;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "tipToman" INTEGER,
ALTER COLUMN "stylistCommissionPercent" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "showcase_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "minRatings" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showcase_settings_pkey" PRIMARY KEY ("id")
);


ALTER TABLE "stylist_services" ADD CONSTRAINT "stylist_services_commission_range" CHECK ("commissionPercent" IS NULL OR "commissionPercent" BETWEEN 0 AND 100);
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tip_nonnegative" CHECK ("tipToman" IS NULL OR "tipToman" >= 0);
ALTER TABLE "showcase_settings" ADD CONSTRAINT "showcase_settings_min_ratings_range" CHECK ("minRatings" BETWEEN 1 AND 50);
