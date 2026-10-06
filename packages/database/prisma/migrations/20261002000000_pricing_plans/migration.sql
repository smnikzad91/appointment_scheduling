-- Pricing plans for the landing page, edited at /admin/pricing (apps/web).
-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPriceToman" INTEGER,
    "maxStylists" INTEGER,
    "smsPerMonth" INTEGER,
    "features" TEXT[],
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "ctaLabel" TEXT NOT NULL DEFAULT 'انتخاب پلن',
    "ctaHref" TEXT NOT NULL DEFAULT '/signup-salon',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_plans_active_sortOrder_idx" ON "pricing_plans"("active", "sortOrder");


-- Start from the plans that were hardcoded in components/marketing/Pricing.tsx. Prices, the
-- Pro stylist limit and SMS allowances were placeholders there, so they start empty.
INSERT INTO "pricing_plans" ("id", "name", "monthlyPriceToman", "maxStylists", "smsPerMonth", "features", "recommended", "ctaLabel", "ctaHref", "sortOrder", "updatedAt") VALUES
  ('plan_basic', 'پایه', NULL, 1, NULL, ARRAY['صفحه رزرو آنلاین و لینک اختصاصی'], false, 'انتخاب پلن', '/signup-salon', 1, CURRENT_TIMESTAMP),
  ('plan_pro', 'حرفه‌ای', NULL, NULL, NULL, ARRAY['اپ اختصاصی برای آرایشگرها', 'بیعانه آنلاین با درگاه بانکی', 'پرونده مشتری و گزارش‌ها'], true, 'انتخاب پلن', '/signup-salon', 2, CURRENT_TIMESTAMP),
  ('plan_multi', 'چندشعبه', NULL, NULL, NULL, ARRAY['چند شعبه با مدیریت یکجا', 'سطح دسترسی برای مدیر و پذیرش', 'گزارش تجمیعی همه شعبه‌ها'], false, 'تماس با ما', '/contact', 3, CURRENT_TIMESTAMP);

INSERT INTO "pricing_settings" ("id", "trialDays", "updatedAt") VALUES ('singleton', 0, CURRENT_TIMESTAMP);
