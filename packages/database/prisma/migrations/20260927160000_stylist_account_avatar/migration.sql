-- A stylist's profile photo doubles as their account photo (apps/api keeps them in sync from now
-- on). Backfill accounts that have no photo of their own yet.
UPDATE "users" u
SET "avatarUrl" = s."avatarUrl"
FROM "stylists" s
WHERE s."userId" = u."id" AND s."avatarUrl" IS NOT NULL AND u."avatarUrl" IS NULL;
