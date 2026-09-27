-- Reviews can target the salon or the appointment's stylist, and need owner/stylist approval
-- before they're public.

-- CreateEnum
CREATE TYPE "ReviewTarget" AS ENUM ('SALON', 'STYLIST');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "reviews_appointmentId_key";

-- AlterTable: add nullable first so existing rows can be backfilled.
ALTER TABLE "reviews" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "salonId" TEXT,
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "stylistId" TEXT,
ADD COLUMN     "target" "ReviewTarget";

-- Existing reviews were about the salon and already public: keep them visible.
UPDATE "reviews" r
SET "salonId" = a."salonId", "target" = 'SALON', "status" = 'APPROVED', "moderatedAt" = r."createdAt"
FROM "appointments" a
WHERE a."id" = r."appointmentId";

ALTER TABLE "reviews" ALTER COLUMN "salonId" SET NOT NULL,
ALTER COLUMN "target" SET NOT NULL;

-- CreateIndex
CREATE INDEX "reviews_salonId_status_createdAt_idx" ON "reviews"("salonId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_stylistId_status_createdAt_idx" ON "reviews"("stylistId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_appointmentId_target_key" ON "reviews"("appointmentId", "target");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
