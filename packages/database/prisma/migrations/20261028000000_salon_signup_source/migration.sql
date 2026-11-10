-- Sign-up «از کجا با ما آشنا شدید؟»: how a salon owner / independent stylist found the platform.
-- Nullable, no backfill: existing salons simply weren't asked.

-- AlterTable
ALTER TABLE "salons" ADD COLUMN "signupSource" TEXT,
ADD COLUMN "signupSourceNote" TEXT;
