import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { planFeatureLines, planPriceLabel, SMS_BILLING_NOTE } from "@/lib/pricing";
import { FAQS } from "@/content/faqs";
import { TUTORIAL_ROLES, TUTORIALS } from "@/content/tutorials";

/**
 * nobatet's business profile: the only source of truth for the live chat's AI (lib/livechat/ai.ts).
 * Plans and the free trial come from the database (as on the pricing section), the FAQ and the Help
 * Center guides from the site's own content, so it never drifts from the site. Cached 10 minutes.
 */

const fa = (n: number) => n.toLocaleString("fa-IR");
let cache: { at: number; text: string } | null = null;

export async function businessProfile() {
  if (cache && Date.now() - cache.at < 600_000) return cache.text;
  const [plans, pricing, dbFaqs] = await Promise.all([
    prisma.pricingPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.pricingSettings.findUnique({ where: { id: "singleton" } }),
    prisma.faq.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);
  const site = SITE_URL;
  const planLine = (p: (typeof plans)[number]) => {
    const price = planPriceLabel(p.monthlyPriceToman);
    const lines = planFeatureLines(p);
    return `- «${p.name}» (${p.audience === "INDEPENDENT" ? "آرایشگر مستقل" : "سالن"}): ${price.amount}${/[0-9۰-۹]/.test(price.amount) && !price.amount.includes("تومان") ? " تومان" : ""}${price.perMonth ? " در ماه" : ""}${p.description ? ` · ${p.description}` : ""}${lines.length ? ` · ${lines.join("، ")}` : ""}`;
  };
  const roleLabel = Object.fromEntries(TUTORIAL_ROLES.map((r) => [r.id, r.label]));
  const guides = TUTORIALS.map((t) =>
    [
      `### ${t.title} (${roleLabel[t.role] ?? t.role}) — ${site}/tutorials/${t.slug}`,
      t.summary,
      ...t.steps.map((s, i) => `${fa(i + 1)}. ${s.title}: ${s.body.replace(/\s+/g, " ").slice(0, 320)}${s.tip ? ` (نکته: ${s.tip.replace(/\s+/g, " ").slice(0, 160)})` : ""}`),
    ].join("\n"),
  );
  const faqs = [...FAQS, ...dbFaqs.map((f) => ({ question: f.question, answer: f.answer }))];
  const trial = pricing?.trialDays ?? 0;

  const text = `# پروفایل کسب‌وکار نوبتت (nobatet)

## نوبتت چیست؟
نوبتت (${site}) سامانه ایرانی نوبت‌دهی آنلاین برای سالن‌های زیبایی و آرایشگرهاست. مشتری از لینک سالن، سایت یا اپ مشتری سالن و آرایشگر را پیدا می‌کند، خدمت و ساعت خالی را انتخاب می‌کند و با کد پیامکی موبایلش نوبت می‌گیرد. سالن و آرایشگر نوبت‌ها، ساعت کاری، خدمات، مشتری‌ها و درآمد را در پنل خود مدیریت می‌کنند. همه چیز فارسی و با تقویم شمسی است و روی گوشی و کامپیوتر کار می‌کند.

## امکانات اصلی
- تقویم نوبت‌ها: نمای روزانه و هفتگی برای هر آرایشگر، جابه‌جایی و لغو نوبت در چند ثانیه؛ تعطیلات رسمی خودکار در تقویم.
- بدون تداخل نوبت: دو مشتری هرگز یک ساعت از یک آرایشگر را نمی‌گیرند، حتی اگر همزمان رزرو کنند؛ مشتری فقط ساعت‌های واقعاً خالی را می‌بیند.
- پیامک تأیید و یادآوری خودکار قبل از نوبت، برای کم‌کردن غیبت مشتری.
- پیش‌پرداخت از درگاه بانکی داخلی یا کیف پول؛ نوبت‌های پرداخت‌نشده خودکار آزاد می‌شوند.
- پرونده مشتری: سابقه نوبت‌ها، خدمات و یادداشت‌های هر مشتری.
- اپ آرایشگر: هر آرایشگر نوبت‌ها، ساعت کاری و مرخصی‌های خودش را می‌بیند؛ اعلان نوبت جدید، تأیید نوبت‌ها، حسابداری و درآمد.
- لینک و QR اختصاصی سالن برای بیو اینستاگرام، واتساپ یا کارت ویزیت.
- گزارش درآمد، نوبت‌های لغوشده و عملکرد هر آرایشگر به تفکیک روز و ماه شمسی.
- اپ اندروید مشتری: جست‌وجوی سالن و آرایشگر، رزرو و پیش‌پرداخت از کیف پول، تغییر یا لغو نوبت و ثبت نظر. صفحه دانلود: ${site}/download-app
- کیف پول: شارژ، پیش‌پرداخت، دریافت سهم و برداشت به حساب بانکی.

## نقش‌ها
${TUTORIAL_ROLES.map((r) => `- ${r.label}: ${r.description}`).join("\n")}
- پشتیبانی نوبتت: همین گفتگوی سایت، و بخش «پشتیبانی» (تیکت) در حساب کاربری.

## اشتراک‌ها (قیمت ماهانه، تومان)
${plans.length ? plans.map(planLine).join("\n") : "- فهرست پلن‌ها در بخش قیمت‌ها: " + site + "/#pricing"}
${trial > 0 ? `- دوره آزمایشی رایگان: ${fa(trial)} روز.` : ""}
- ${SMS_BILLING_NOTE}
- قیمت‌ها و پلن‌ها: ${site}/#pricing

## سؤالات متداول
${faqs.map((f) => `- ${f.question}\n  ${f.answer.replace(/\s+/g, " ")}`).join("\n")}

## راهنماها (مرکز راهنما: ${site}/tutorials)
${guides.join("\n\n")}
`;
  cache = { at: Date.now(), text };
  return text;
}
