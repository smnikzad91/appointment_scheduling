-- Per-page SEO (title / description / keywords) edited at /admin/seo-settings; replaces the single
-- home-page site_seo row (kept until the next migration). Seeded with the values the pages used until now (apps/web lib/pageSeoDefaults.ts).

-- CreateTable
CREATE TABLE "page_seo" (
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_seo_pkey" PRIMARY KEY ("key")
);

-- A home-page entry saved in site_seo (none on 2026-10-06) wins over the default below.
INSERT INTO "page_seo" ("key", "title", "description", "keywords", "updatedAt")
SELECT 'home', "title", "description", COALESCE("keywords", ARRAY[]::TEXT[]), "updatedAt" FROM "site_seo" ORDER BY "updatedAt" DESC LIMIT 1;

INSERT INTO "page_seo" ("key", "title", "description", "keywords", "updatedAt") VALUES
    ('home', 'نوبتت — نرم‌افزار نوبت‌دهی آنلاین آرایشگاه و سالن زیبایی', 'نرم‌افزار نوبت‌دهی آنلاین آرایشگاه و سالن زیبایی: رزرو اینترنتی بدون تماس، پیامک یادآوری، پیش‌پرداخت با کیف پول، حسابداری و اپ اندروید؛ برای سالن‌ها و آرایشگرهای مستقل.', ARRAY['نوبت‌دهی آنلاین', 'نرم‌افزار نوبت‌دهی آرایشگاه', 'نرم افزار نوبت دهی سالن زیبایی', 'رزرو آنلاین آرایشگاه', 'رزرو نوبت سالن زیبایی', 'نوبت آرایشگاه', 'نوبت‌دهی اینترنتی', 'مدیریت سالن زیبایی', 'نرم‌افزار آرایشگاه زنانه', 'نرم‌افزار آرایشگاه مردانه', 'آرایشگر مستقل', 'پیامک یادآوری نوبت', 'اپلیکیشن نوبت‌دهی', 'نوبتت']::TEXT[], CURRENT_TIMESTAMP),
    ('salons', 'جستجوی سالن زیبایی و آرایشگاه نزدیک شما', 'سالن‌های زیبایی و آرایشگاه‌های نزدیک خود را پیدا کنید: مقایسه امتیاز، خدمات و فاصله، و رزرو آنلاین نوبت در نوبتت.', ARRAY['آرایشگاه نزدیک من', 'سالن زیبایی نزدیک من', 'رزرو آنلاین آرایشگاه', 'نوبت آرایشگاه', 'بهترین آرایشگاه']::TEXT[], CURRENT_TIMESTAMP),
    ('signup-salon', 'ثبت‌نام رایگان سالن زیبایی و آرایشگاه', 'سالن زیبایی یا آرایشگاه خود را در نوبتت ثبت کنید: نوبت‌دهی آنلاین، تقویم آرایشگرها، پیامک یادآوری، پیش‌پرداخت با کیف پول و حسابداری سالن.', ARRAY['ثبت سالن زیبایی', 'نرم‌افزار نوبت‌دهی آرایشگاه', 'نرم افزار مدیریت سالن زیبایی', 'نوبت‌دهی آنلاین آرایشگاه', 'اپلیکیشن نوبت دهی آرایشگاه']::TEXT[], CURRENT_TIMESTAMP),
    ('signup-independent', 'ثبت‌نام آرایشگر مستقل — صفحه رزرو آنلاین شخصی', 'آرایشگر مستقل هستید؟ در نوبتت صفحه رزرو آنلاین خودتان را بسازید: نوبت اینترنتی، پیامک یادآوری، پیش‌پرداخت و حسابداری؛ در سالن، استودیو یا منزل مشتری.', ARRAY['آرایشگر مستقل', 'نوبت‌دهی آرایشگر', 'آرایشگر در منزل', 'صفحه رزرو آنلاین آرایشگر', 'نرم‌افزار نوبت‌دهی آرایشگر']::TEXT[], CURRENT_TIMESTAMP),
    ('salon-page', '{name} — رزرو آنلاین نوبت در {city}', '{name}، سالن زیبایی در {city} — مشاهده خدمات، آرایشگرها و نظرات، و رزرو آنلاین نوبت در نوبتت.', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
    ('independent-page', '{name} — رزرو آنلاین نوبت در {city}', '{name}، آرایشگر مستقل در {city} — مشاهده خدمات و نظرات، و رزرو آنلاین نوبت در نوبتت.', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
    ('download-app', 'دانلود اپلیکیشن اندروید نوبتت', 'اپ اندروید نوبتت برای مشتری‌ها، آرایشگرها و سالن‌ها: رزرو و مدیریت نوبت، کیف پول و اعلان‌ها. دانلود مستقیم، کافه‌بازار و مایکت.', ARRAY['دانلود نوبتت', 'اپلیکیشن نوبت دهی آرایشگاه', 'اپ رزرو آرایشگاه', 'دانلود اپلیکیشن نوبت‌دهی']::TEXT[], CURRENT_TIMESTAMP),
    ('tutorials', 'راهنمای استفاده', 'راهنمای قدم‌به‌قدم نوبتت با تصویر برای صاحبان سالن، آرایشگرها و مشتری‌ها: ثبت سالن، آرایشگرها، ساعت کاری، رزرو آنلاین و پیگیری نوبت.', ARRAY['راهنمای نوبتت', 'آموزش نوبت‌دهی آنلاین', 'آموزش ثبت سالن', 'راهنمای رزرو نوبت']::TEXT[], CURRENT_TIMESTAMP),
    ('faq', 'سوالات متداول', 'پاسخ رایج‌ترین سوال‌ها درباره نوبتت — ثبت سالن، رزرو نوبت، پلن‌ها و پشتیبانی.', ARRAY['سوالات متداول', 'FAQ', 'پشتیبانی', 'نوبت‌دهی آنلاین', 'نوبتت']::TEXT[], CURRENT_TIMESTAMP),
    ('blog', 'وبلاگ', 'راهنمای مدیریت سالن زیبایی، جذب مشتری و نوبت‌دهی آنلاین. مقالات کاربردی برای صاحبان سالن و آرایشگرها.', ARRAY['وبلاگ', 'مدیریت سالن زیبایی', 'نوبت‌دهی آنلاین', 'آرایشگاه', 'نوبتت']::TEXT[], CURRENT_TIMESTAMP),
    ('news', 'اخبار', 'آخرین اخبار، به‌روزرسانی‌ها و اطلاعیه‌های نوبتت. از جدیدترین امکانات نوبت‌دهی آنلاین سالن‌ها مطلع شوید.', ARRAY['اخبار نوبتت', 'به‌روزرسانی محصول', 'اطلاعیه']::TEXT[], CURRENT_TIMESTAMP),
    ('contact', 'تماس با ما', 'سوال، پیشنهاد یا مشکل دارید؟ از طریق فرم تماس با تیم نوبتت در ارتباط باشید.', ARRAY['تماس با ما', 'پشتیبانی', 'ارتباط', 'نوبتت']::TEXT[], CURRENT_TIMESTAMP),
    ('privacy', 'حریم خصوصی', 'سیاست حریم خصوصی نوبتت — چگونه اطلاعات شما را جمع‌آوری، استفاده و حفاظت می‌کنیم.', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
    ('terms', 'شرایط استفاده', 'شرایط و ضوابط استفاده از خدمات نوبتت.', ARRAY[]::TEXT[], CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- site_seo stays for now: deploy.sh migrates before reloading the apps, and the code still live
-- during that moment reads it. A later migration drops it.
