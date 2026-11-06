-- Unpaid wallet balance requests: when they were made, and the one reminder SMS 3 days later.
ALTER TABLE "appointments" ADD COLUMN "balanceRequestedAt" TIMESTAMP(3),
ADD COLUMN "balanceReminderSentAt" TIMESTAMP(3);

-- Requests made before this existed count from when the booking was completed.
UPDATE "appointments" SET "balanceRequestedAt" = COALESCE("completedAt", "updatedAt")
WHERE "balanceMethod" = 'WALLET' AND "balancePaidAt" IS NULL AND "balanceDueToman" > 0;
