-- "1 hour before" SMS reminder (apps/api src/sms/reminder.service.ts): set once sent, cleared on reschedule.
ALTER TABLE "appointments" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
