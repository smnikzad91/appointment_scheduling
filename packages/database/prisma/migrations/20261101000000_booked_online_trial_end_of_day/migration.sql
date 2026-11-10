-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "bookedOnline" BOOLEAN NOT NULL DEFAULT false;

-- Online bookings pre-pay from the wallet (since 2026-10-05); staff-made ones never do.
UPDATE "appointments" SET "bookedOnline" = true WHERE "prepaymentStatus" IS NOT NULL;

-- Free trials now end at 23:59:59 Tehran on their last day. Running trials that ended at the
-- sign-up's time of day move to the end of that day (planExpiresAt with them while it is still
-- the trial's end, i.e. no plan was bought).
WITH t AS (
  SELECT id, "trialEndsAt",
    ((date_trunc('day', ("trialEndsAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tehran') + interval '1 day' - interval '1 second')
      AT TIME ZONE 'Asia/Tehran') AT TIME ZONE 'UTC' AS eod
  FROM "salons"
  WHERE "trialEndsAt" IS NOT NULL AND "trialEndsAt" > now() AT TIME ZONE 'UTC' AND "planExpiresAt" = "trialEndsAt"
)
UPDATE "salons" s SET "trialEndsAt" = t.eod, "planExpiresAt" = t.eod
FROM t WHERE s.id = t.id AND t."trialEndsAt" <> t.eod;
