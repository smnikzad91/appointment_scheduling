-- "Time to book again" SMS after a completed appointment: per-service setting (off by default, so
-- nothing is sent until a salon turns it on), a per-stylist override, and per-appointment tracking.
ALTER TABLE "services" ADD COLUMN "rebookReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rebookReminderDays" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "stylist_services" ADD COLUMN "overrideRebookReminderEnabled" BOOLEAN,
ADD COLUMN "overrideRebookReminderDays" INTEGER;

ALTER TABLE "appointments" ADD COLUMN "rebookReminderSentAt" TIMESTAMP(3),
ADD COLUMN "rebookReminderAttempts" INTEGER NOT NULL DEFAULT 0;
