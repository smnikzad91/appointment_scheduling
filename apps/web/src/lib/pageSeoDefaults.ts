import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE } from "@/lib/site";

// The public pages whose search-engine title / description / keywords the admin edits
// (/admin/seo-settings, PageSeo rows), with the defaults used when a field is left empty.
// The migration that created page_seo seeded these same values. Titles get « | نوبتت» from the
// root layout's template, except `home`, whose title is complete.
// The salon-page entries are templates: {name} and {city} are filled per salon; their description
// is used only when the salon hasn't written one of its own.

export interface PageSeoValues {
  title: string;
  description: string;
  keywords: string[];
}

export interface PageSeoEntry extends PageSeoValues {
  /** Admin label (the admin panel is bilingual). */
  label: { fa: string; en: string };
  /** Where it shows (for the admin list). */
  path: string;
  /** Placeholders the fields may use. */
  placeholders?: string[];
}

export const PAGE_SEO_KEYS = [
  "home",
  "salons",
  "city-page",
  "signup-salon",
  "signup-independent",
  "salon-page",
  "independent-page",
  "download-app",
  "tutorials",
  "faq",
  "blog",
  "news",
  "contact",
  "privacy",
  "terms",
] as const;

export type PageSeoKey = (typeof PAGE_SEO_KEYS)[number];

export const isPageSeoKey = (k: string): k is PageSeoKey => (PAGE_SEO_KEYS as readonly string[]).includes(k);

export const PAGE_SEO_DEFAULTS: Record<PageSeoKey, PageSeoEntry> = {
  home: {
    label: { fa: "صفحه اصلی", en: "Home page" },
    path: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
  },
  salons: {
    label: { fa: "جستجوی سالن", en: "Salon search" },
    path: "/salons",
    title: "جستجوی سالن زیبایی و آرایشگاه نزدیک شما",
    description: `سالن‌های زیبایی و آرایشگاه‌های نزدیک خود را پیدا کنید: مقایسه امتیاز، خدمات و فاصله، و رزرو آنلاین نوبت در ${SITE_NAME}.`,
    keywords: ["آرایشگاه نزدیک من", "سالن زیبایی نزدیک من", "رزرو آنلاین آرایشگاه", "نوبت آرایشگاه", "بهترین آرایشگاه"],
  },
  "city-page": {
    label: { fa: "صفحه هر شهر (الگو)", en: "Each city page (template)" },
    path: "/salons/<شهر>",
    placeholders: ["{city}", "{province}", "{count}"],
    title: "آرایشگاه و سالن زیبایی در {city} — رزرو آنلاین نوبت",
    description: "آرایشگاه‌ها و سالن‌های زیبایی {city}: خدمات، قیمت، امتیاز و نظرات مشتری‌ها را ببینید و بدون تماس، آنلاین نوبت بگیرید.",
    keywords: ["آرایشگاه {city}", "سالن زیبایی {city}", "نوبت آرایشگاه {city}", "رزرو آنلاین آرایشگاه {city}", "آرایشگر {city}"],
  },
  "signup-salon": {
    label: { fa: "ثبت‌نام سالن", en: "Salon sign-up" },
    path: "/signup-salon",
    title: "ثبت‌نام رایگان سالن زیبایی و آرایشگاه",
    description:
      "سالن زیبایی یا آرایشگاه خود را در نوبتت ثبت کنید: نوبت‌دهی آنلاین، تقویم آرایشگرها، پیامک یادآوری، پیش‌پرداخت با کیف پول و حسابداری سالن.",
    keywords: ["ثبت سالن زیبایی", "نرم‌افزار نوبت‌دهی آرایشگاه", "نرم افزار مدیریت سالن زیبایی", "نوبت‌دهی آنلاین آرایشگاه", "اپلیکیشن نوبت دهی آرایشگاه"],
  },
  "signup-independent": {
    label: { fa: "ثبت‌نام آرایشگر مستقل", en: "Independent stylist sign-up" },
    path: "/signup-salon?type=independent",
    title: "ثبت‌نام آرایشگر مستقل — صفحه رزرو آنلاین شخصی",
    description:
      "آرایشگر مستقل هستید؟ در نوبتت صفحه رزرو آنلاین خودتان را بسازید: نوبت اینترنتی، پیامک یادآوری، پیش‌پرداخت و حسابداری؛ در سالن، استودیو یا منزل مشتری.",
    keywords: ["آرایشگر مستقل", "نوبت‌دهی آرایشگر", "آرایشگر در منزل", "صفحه رزرو آنلاین آرایشگر", "نرم‌افزار نوبت‌دهی آرایشگر"],
  },
  "salon-page": {
    label: { fa: "صفحه هر سالن (الگو)", en: "Each salon's page (template)" },
    path: "/s/…",
    placeholders: ["{name}", "{city}"],
    title: "{name} — رزرو آنلاین نوبت در {city}",
    description: `{name}، سالن زیبایی در {city} — مشاهده خدمات، آرایشگرها و نظرات، و رزرو آنلاین نوبت در ${SITE_NAME}.`,
    keywords: [],
  },
  "independent-page": {
    label: { fa: "صفحه هر آرایشگر مستقل (الگو)", en: "Each independent stylist's page (template)" },
    path: "/s/…",
    placeholders: ["{name}", "{city}"],
    title: "{name} — رزرو آنلاین نوبت در {city}",
    description: `{name}، آرایشگر مستقل در {city} — مشاهده خدمات و نظرات، و رزرو آنلاین نوبت در ${SITE_NAME}.`,
    keywords: [],
  },
  "download-app": {
    label: { fa: "دانلود اپلیکیشن", en: "App download" },
    path: "/download-app",
    title: `دانلود اپلیکیشن اندروید ${SITE_NAME}`,
    description:
      "اپ اندروید نوبتت برای مشتری‌ها، آرایشگرها و سالن‌ها: رزرو و مدیریت نوبت، کیف پول و اعلان‌ها. دانلود مستقیم، کافه‌بازار و مایکت.",
    keywords: ["دانلود نوبتت", "اپلیکیشن نوبت دهی آرایشگاه", "اپ رزرو آرایشگاه", "دانلود اپلیکیشن نوبت‌دهی"],
  },
  tutorials: {
    label: { fa: "راهنمای استفاده", en: "Help center" },
    path: "/tutorials",
    title: "راهنمای استفاده",
    description: `راهنمای قدم‌به‌قدم ${SITE_NAME} با تصویر برای صاحبان سالن، آرایشگرها و مشتری‌ها: ثبت سالن، آرایشگرها، ساعت کاری، رزرو آنلاین و پیگیری نوبت.`,
    keywords: ["راهنمای نوبتت", "آموزش نوبت‌دهی آنلاین", "آموزش ثبت سالن", "راهنمای رزرو نوبت"],
  },
  faq: {
    label: { fa: "سوالات متداول", en: "FAQ" },
    path: "/faq",
    title: "سوالات متداول",
    description: "پاسخ رایج‌ترین سوال‌ها درباره نوبتت — ثبت سالن، رزرو نوبت، پلن‌ها و پشتیبانی.",
    keywords: ["سوالات متداول", "FAQ", "پشتیبانی", "نوبت‌دهی آنلاین", "نوبتت"],
  },
  blog: {
    label: { fa: "وبلاگ", en: "Blog" },
    path: "/blog",
    title: "وبلاگ",
    description: "راهنمای مدیریت سالن زیبایی، جذب مشتری و نوبت‌دهی آنلاین. مقالات کاربردی برای صاحبان سالن و آرایشگرها.",
    keywords: ["وبلاگ", "مدیریت سالن زیبایی", "نوبت‌دهی آنلاین", "آرایشگاه", "نوبتت"],
  },
  news: {
    label: { fa: "اخبار", en: "News" },
    path: "/news",
    title: "اخبار",
    description: "آخرین اخبار، به‌روزرسانی‌ها و اطلاعیه‌های نوبتت. از جدیدترین امکانات نوبت‌دهی آنلاین سالن‌ها مطلع شوید.",
    keywords: ["اخبار نوبتت", "به‌روزرسانی محصول", "اطلاعیه"],
  },
  contact: {
    label: { fa: "تماس با ما", en: "Contact" },
    path: "/contact",
    title: "تماس با ما",
    description: "سوال، پیشنهاد یا مشکل دارید؟ از طریق فرم تماس با تیم نوبتت در ارتباط باشید.",
    keywords: ["تماس با ما", "پشتیبانی", "ارتباط", "نوبتت"],
  },
  privacy: {
    label: { fa: "حریم خصوصی", en: "Privacy" },
    path: "/privacy",
    title: "حریم خصوصی",
    description: "سیاست حریم خصوصی نوبتت — چگونه اطلاعات شما را جمع‌آوری، استفاده و حفاظت می‌کنیم.",
    keywords: [],
  },
  terms: {
    label: { fa: "شرایط استفاده", en: "Terms" },
    path: "/terms",
    title: "شرایط استفاده",
    description: "شرایط و ضوابط استفاده از خدمات نوبتت.",
    keywords: [],
  },
};
