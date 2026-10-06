-- Customers can stop promotional ("time to book again") SMS: via the link in the text or their
-- dashboard. The rebook SMS carries a short code (/r/<code>) for that page.
ALTER TABLE "users" ADD COLUMN "promoSmsOptOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "appointments" ADD COLUMN "rebookCode" TEXT;
CREATE UNIQUE INDEX "appointments_rebookCode_key" ON "appointments"("rebookCode");

-- New services start with rebook reminders on (30 days). Existing rows keep their current value.
ALTER TABLE "services" ALTER COLUMN "rebookReminderEnabled" SET DEFAULT true;
