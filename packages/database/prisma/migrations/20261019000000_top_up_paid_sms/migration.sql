-- AlterTable
ALTER TABLE "wallet_top_ups" ADD COLUMN     "paidSmsAt" TIMESTAMP(3),
ADD COLUMN     "paidSmsAttempts" INTEGER NOT NULL DEFAULT 0;


-- Top-ups paid before this feature are not texted now: mark them done.
UPDATE "wallet_top_ups" SET "paidSmsAt" = "paidAt" WHERE "status" = 'PAID';
