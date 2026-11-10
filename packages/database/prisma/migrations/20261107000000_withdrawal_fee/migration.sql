-- Withdrawal fee (1% capped at 20,000 toman), fixed at request time; the transfer is amount − fee.
-- Existing requests were made without a fee: 0.
ALTER TABLE "withdrawal_requests" ADD COLUMN "feeToman" INTEGER NOT NULL DEFAULT 0;
