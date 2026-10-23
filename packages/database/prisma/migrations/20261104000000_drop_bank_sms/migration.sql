-- Wallet top-ups go only through nodepass.ir now: the platform's own cards, the bank-SMS device and its
-- SMS log are gone (rows backed up in /root/nobta-backups/bank-sms-admin-cards-*.json).
-- Older top-ups keep the card they were paid to in the snapshot columns.
UPDATE "wallet_top_ups" t
SET "cardNumber" = c."cardNumber", "cardOwnerName" = c."ownerName", "cardBankName" = c."bankName"
FROM "admin_cards" c
WHERE t."adminCardId" = c."id" AND t."cardNumber" IS NULL;

DROP INDEX IF EXISTS "wallet_top_ups_pending_amount_key";
DROP INDEX IF EXISTS "wallet_top_ups_adminCardId_status_payableRial_idx";
ALTER TABLE "wallet_top_ups" DROP CONSTRAINT IF EXISTS "wallet_top_ups_adminCardId_fkey";
ALTER TABLE "wallet_top_ups" DROP COLUMN "adminCardId";

DROP TABLE "bank_sms";
DROP TABLE "bank_sms_devices";
DROP TABLE "admin_cards";
DROP TYPE "BankSmsStatus";
