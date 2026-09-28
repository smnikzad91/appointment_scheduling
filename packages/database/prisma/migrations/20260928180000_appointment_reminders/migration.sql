-- SMS reminders before an appointment: set once the reminder is sent (or skipped).
ALTER TABLE "appointments" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- Past appointments never get a reminder.
UPDATE "appointments" SET "reminderSentAt" = CURRENT_TIMESTAMP WHERE "startAt" <= CURRENT_TIMESTAMP;

CREATE INDEX "appointments_reminderSentAt_startAt_idx" ON "appointments"("reminderSentAt", "startAt");
