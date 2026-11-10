-- CreateEnum
CREATE TYPE "PlanAudience" AS ENUM ('SALON', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "SmsLogStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED_LOW_BALANCE');

-- AlterTable
ALTER TABLE "pricing_plans" ADD COLUMN     "audience" "PlanAudience" NOT NULL DEFAULT 'SALON';

-- AlterTable
ALTER TABLE "salons" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lowBalanceSmsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payerUserId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "parts" INTEGER NOT NULL,
    "costToman" INTEGER NOT NULL DEFAULT 0,
    "status" "SmsLogStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sms_logs_payerUserId_createdAt_idx" ON "sms_logs"("payerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "sms_logs_appointmentId_idx" ON "sms_logs"("appointmentId");


-- The four tiers (2026-10-19). The old plans are hidden, not deleted: salons on them keep them.
UPDATE "pricing_plans" SET "active" = false, "recommended" = false;

INSERT INTO "pricing_plans" ("id", "name", "audience", "description", "monthlyPriceToman", "maxStylists", "features", "recommended", "ctaLabel", "ctaHref", "sortOrder", "active", "updatedAt") VALUES
  ('plan_solo',    'آرایشگر مستقل', 'INDEPENDENT', 'برای آرایشگر یا باربر تک‌نفره با یک تقویم', 499000,  1,  ARRAY[]::text[], false, 'شروع رایگان', '/signup-salon', 101, true, now()),
  ('plan_starter', 'سالن استارتر',  'SALON',       'برای سالن‌های کوچک',                          999000,  3,  ARRAY[]::text[], false, 'شروع رایگان', '/signup-salon', 102, true, now()),
  ('plan_growth',  'سالن رشد',      'SALON',       'برای سالن‌های در حال رشد',                    1499000, 5,  ARRAY[]::text[], true,  'شروع رایگان', '/signup-salon', 103, true, now()),
  ('plan_large',   'سالن بزرگ',     'SALON',       'برای سالن‌های بزرگ و پرکارمند',               1999000, 10, ARRAY[]::text[], false, 'شروع رایگان', '/signup-salon', 104, true, now());

-- Every new salon and independent stylist gets one month free.
INSERT INTO "pricing_settings" ("id", "trialDays", "updatedAt") VALUES ('singleton', 30, now())
ON CONFLICT ("id") DO UPDATE SET "trialDays" = 30, "updatedAt" = now();
