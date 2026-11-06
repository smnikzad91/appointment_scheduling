-- Live chat: saved answers (also sent automatically on keywords), «راضی بودید؟» rating, and a ticket made from a chat.
ALTER TABLE "live_chats" ADD COLUMN "autoReplied" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "rating" INTEGER,
ADD COLUMN "ratedAt" TIMESTAMP(3),
ADD COLUMN "ticketId" TEXT;

CREATE TABLE "live_chat_quick_replies" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autoReply" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_chat_quick_replies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_chat_quick_replies_key_key" ON "live_chat_quick_replies"("key");

-- Starter answers (the platform's real rules as of 2026-11-07); the admin edits them at /admin/live-chat.
INSERT INTO "live_chat_quick_replies" ("id", "key", "title", "text", "keywords", "autoReply", "order", "updatedAt") VALUES
('qr_topup', 'topup', 'شارژ کیف پول',
 'برای شارژ کیف پول، در پنل خودتان «کیف پول» را باز کنید و مبلغ را بنویسید. بعد دقیقاً همان مبلغی که نشان داده می‌شود (تا ریال) را به کارت نمایش‌داده‌شده واریز کنید؛ چند دقیقه بعد کیف پول خودکار شارژ می‌شود و پیامک می‌گیرید.
راهنما: https://nobatet.app/tutorials/wallet-and-support',
 ARRAY['شارژ', 'افزایش موجودی', 'شارژکیف'], true, 1, CURRENT_TIMESTAMP),
('qr_cancel', 'cancel', 'لغو نوبت و پیش‌پرداخت',
 'لغو نوبت از «نوبت‌های من» انجام می‌شود. اگر سالن نوبت را لغو کند یا شما پیش از تایید سالن لغو کنید، کل پیش‌پرداخت به کیف پولتان برمی‌گردد. اگر بعد از تایید سالن لغو کنید، پیش‌پرداخت به سالن می‌رسد.
راهنما: https://nobatet.app/tutorials/my-bookings',
 ARRAY['لغو', 'کنسل', 'برگشت پول', 'پس گرفتن پول'], true, 2, CURRENT_TIMESTAMP),
('qr_withdraw', 'withdraw', 'برداشت از کیف پول',
 'برای برداشت، در «کیف پول» درخواست برداشت ثبت کنید (حداقل ۵۰٬۰۰۰ تومان، با شماره شبا). کارمزد برداشت ۱٪ و حداکثر ۲۰٬۰۰۰ تومان است. پس از بررسی، مبلغ به حسابتان واریز و پیامک می‌شود.',
 ARRAY['برداشت', 'تسویه', 'شبا'], true, 3, CURRENT_TIMESTAMP),
('qr_stylist', 'stylist', 'افزودن آرایشگر',
 'در پنل سالن، بخش «آرایشگرها» دکمه دعوت را بزنید و نام و موبایل آرایشگر را وارد کنید؛ یک لینک فعال‌سازی برای او ساخته می‌شود. هر آرایشگر جدا از سالن باید تایید مدیریت نوبتت را بگیرد و بعد از تایید فعال می‌شود.
راهنما: https://nobatet.app/tutorials/add-stylists',
 ARRAY['افزودن آرایشگر', 'اضافه کردن آرایشگر', 'دعوت آرایشگر', 'آرایشگر اضافه'], true, 4, CURRENT_TIMESTAMP),
('qr_register', 'register', 'ثبت‌نام سالن',
 'برای ثبت سالن یا آرایشگر مستقل از «ثبت‌نام سالن» در سایت اقدام کنید. پس از تایید مدیریت، یک ماه استفاده رایگان از پلن انتخابی دارید.
راهنما: https://nobatet.app/tutorials/register-salon',
 ARRAY['ثبت سالن', 'ثبت نام سالن', 'ثبت‌نام سالن', 'عضویت سالن'], true, 5, CURRENT_TIMESTAMP);
