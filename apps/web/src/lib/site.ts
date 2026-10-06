// Product identity used by metadata, structured data, sitemap and outgoing links.
// The public origin comes from the environment so the same build works on any domain.

export const SITE_NAME = "نوبتت";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_TITLE = "نوبتت — سامانه نوبت‌دهی آنلاین سالن‌های زیبایی";

export const SITE_DESCRIPTION =
  "نوبتت سامانه نوبت‌دهی آنلاین مخصوص سالن‌های زیبایی است. مشتری‌ها بدون تماس نوبت می‌گیرند و شما با تقویم آنلاین، پیامک یادآوری و بیعانه بانکی مدیریت می‌کنید.";

/** Sales / consulting phone on the landing page (tap to call). */
export const CONSULT_PHONE = "09233033415";
/** Shown with Persian digits, grouped; render it dir="ltr" so it doesn't flip in RTL text. */
export const CONSULT_PHONE_DISPLAY = "۰۹۲۳ ۳۰۳ ۳۴۱۵";
