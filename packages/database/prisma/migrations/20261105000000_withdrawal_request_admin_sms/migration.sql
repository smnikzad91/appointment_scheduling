-- The platform admin is texted when someone asks to withdraw (apps/api wallet/withdrawal-sms.service).
ALTER TABLE "withdrawal_requests" ADD COLUMN "requestedSmsAt" TIMESTAMP(3),
ADD COLUMN "requestedSmsAttempts" INTEGER NOT NULL DEFAULT 0;

-- Requests made before this aren't texted.
UPDATE "withdrawal_requests" SET "requestedSmsAt" = "createdAt";
