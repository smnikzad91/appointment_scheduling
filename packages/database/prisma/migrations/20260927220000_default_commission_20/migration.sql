-- New stylists start at a 20% share. Existing stylists keep their current percent (those at 0%
-- are flagged in the salon panel until the owner sets one).
ALTER TABLE "stylists" ALTER COLUMN "commissionPercent" SET DEFAULT 20;
