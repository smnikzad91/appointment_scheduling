// Product identity used by metadata, structured data, sitemap and outgoing links.
// The public origin comes from the environment so the same build works on any domain.

export const SITE_NAME = "نوبتت";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_TITLE = "نوبتت — نرم‌افزار نوبت‌دهی آنلاین آرایشگاه و سالن زیبایی";

export const SITE_DESCRIPTION =
  "نرم‌افزار نوبت‌دهی آنلاین آرایشگاه و سالن زیبایی: رزرو اینترنتی بدون تماس، پیامک یادآوری، پیش‌پرداخت با کیف پول، حسابداری و اپ اندروید؛ برای سالن‌ها و آرایشگرهای مستقل.";

/** Search phrases people use for this product (meta keywords; Google ignores them, other engines may not). */
export const SITE_KEYWORDS = [
  "نوبت‌دهی آنلاین",
  "نرم‌افزار نوبت‌دهی آرایشگاه",
  "نرم افزار نوبت دهی سالن زیبایی",
  "رزرو آنلاین آرایشگاه",
  "رزرو نوبت سالن زیبایی",
  "نوبت آرایشگاه",
  "نوبت‌دهی اینترنتی",
  "مدیریت سالن زیبایی",
  "نرم‌افزار آرایشگاه زنانه",
  "نرم‌افزار آرایشگاه مردانه",
  "آرایشگر مستقل",
  "پیامک یادآوری نوبت",
  "اپلیکیشن نوبت‌دهی",
  "نوبتت",
];

/** Sales / consulting phone on the landing page (tap to call). */
export const CONSULT_PHONE = "09024158946";
/** Shown with Persian digits, grouped; render it dir="ltr" so it doesn't flip in RTL text. */
export const CONSULT_PHONE_DISPLAY = "۰۹۰۲ ۴۱۵ ۸۹۴۶";
