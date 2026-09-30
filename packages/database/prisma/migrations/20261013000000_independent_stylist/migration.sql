-- Independent (freelance) stylists: a one-person business modelled as a Salon of kind INDEPENDENT,
-- owned by an INDEPENDENT_STYLIST account that is also its only Stylist. Existing salons stay SALON.

-- CreateEnum
CREATE TYPE "SalonKind" AS ENUM ('SALON', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "ServiceLocation" AS ENUM ('STUDIO', 'HOME', 'CLIENT_HOME');

-- AlterEnum (the new value isn't used in this migration, so no separate transaction is needed)
ALTER TYPE "Role" ADD VALUE 'INDEPENDENT_STYLIST';

-- AlterTable
ALTER TABLE "salons" ADD COLUMN     "kind" "SalonKind" NOT NULL DEFAULT 'SALON',
ADD COLUMN     "serviceArea" TEXT,
ADD COLUMN     "serviceLocations" "ServiceLocation"[] DEFAULT ARRAY[]::"ServiceLocation"[];

-- Search filters by kind among active salons.
CREATE INDEX "salons_kind_status_idx" ON "salons"("kind", "status");

-- Where an independent stylist's booking happens; for a home visit, the customer's address.
ALTER TABLE "appointments" ADD COLUMN     "serviceLocation" "ServiceLocation",
ADD COLUMN     "visitAddress" TEXT;
