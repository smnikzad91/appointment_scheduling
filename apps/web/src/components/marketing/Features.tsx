import { Calendar, MessageSquare, CreditCard, UserPlus, Scissors, QrCode, ShieldCheck, LineChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SectionHead from "./SectionHead";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Calendar,
    title: "تقویم نوبت‌دهی",
    description: "نمای روزانه و هفتگی برای هر آرایشگر، با جابه‌جایی و لغو نوبت در چند ثانیه.",
  },
  {
    icon: MessageSquare,
    title: "یادآوری پیامکی",
    description: "ارسال خودکار پیامک تأیید و یادآوری قبل از نوبت، برای کم‌کردن غیبت مشتری.",
  },
  {
    icon: CreditCard,
    title: "بیعانه آنلاین",
    description: "دریافت پیش‌پرداخت از طریق درگاه بانکی داخلی و آزادشدن خودکار نوبت‌های پرداخت‌نشده.",
  },
  {
    icon: UserPlus,
    title: "پرونده مشتریان",
    description: "سابقه نوبت‌ها، خدمات دریافتی و یادداشت‌های هر مشتری در یک جا.",
  },
  {
    icon: Scissors,
    title: "پنل آرایشگر",
    description: "هر آرایشگر نوبت‌های خودش، ساعت کاری و مرخصی‌ها را در اپ اختصاصی می‌بیند.",
  },
  {
    icon: QrCode,
    title: "لینک و QR اختصاصی",
    description: "صفحه رزرو مخصوص سالن شما برای بیو اینستاگرام، واتساپ یا چاپ روی کارت ویزیت.",
  },
  {
    icon: ShieldCheck,
    title: "بدون تداخل نوبت",
    description: "دو مشتری هرگز یک ساعت از یک آرایشگر را نمی‌گیرند؛ حتی اگر همزمان رزرو کنند.",
  },
  {
    icon: LineChart,
    title: "گزارش‌ها",
    description: "درآمد، نوبت‌های لغوشده و عملکرد هر آرایشگر به تفکیک روز و ماه شمسی.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHead kicker="امکانات" title="هرچه یک سالن برای مدیریت نوبت لازم دارد" />
          <p className="g-reveal max-w-sm text-sm leading-7 text-g-muted md:text-end">
            از تقویم و پیامک تا بیعانه و گزارش؛ کاملاً فارسی، راست‌به‌چپ و با تقویم شمسی.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="g-glass-soft g-reveal group rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:border-g-accent/30 hover:bg-white/[0.05]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-g-accent/25 bg-g-accent/10 text-g-accent transition group-hover:shadow-[0_0_24px_-4px_rgb(242_135_106/0.7)]">
                <feature.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 font-bold text-g-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-g-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
