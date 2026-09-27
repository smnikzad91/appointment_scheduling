// Product identity used by metadata, structured data, sitemap and outgoing links.
// The public origin comes from the environment so the same build works on any domain.

export const SITE_NAME = "نوبتا";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_TITLE = "نوبتا — سامانه نوبت‌دهی آنلاین سالن‌های زیبایی";

export const SITE_DESCRIPTION =
  "نوبتا سامانه نوبت‌دهی آنلاین مخصوص سالن‌های زیبایی است. مشتری‌ها بدون تماس نوبت می‌گیرند و شما با تقویم آنلاین، پیامک یادآوری و بیعانه بانکی مدیریت می‌کنید.";
