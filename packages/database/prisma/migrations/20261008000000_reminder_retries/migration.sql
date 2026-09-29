-- Reminder SMS: per-recipient sent time and attempt count (so a failed send is retried on its own)
-- and a short lease so several API instances never handle one booking at once.
ALTER TABLE "appointments" ADD COLUMN "reminderLeaseUntil" TIMESTAMP(3),
ADD COLUMN "customerReminderSentAt" TIMESTAMP(3),
ADD COLUMN "customerReminderAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "stylistReminderSentAt" TIMESTAMP(3),
ADD COLUMN "stylistReminderAttempts" INTEGER NOT NULL DEFAULT 0;
