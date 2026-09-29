-- Optional receipt photo on a salon expense (private; only the owner can open it).
ALTER TABLE "salon_expenses" ADD COLUMN "receiptUrl" TEXT;
