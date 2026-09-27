import { Calendar, MessageSquare, CreditCard, UserPlus, Scissors, QrCode, ShieldCheck, LineChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
    <section id="features" className="bg-[#f7f0e8] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-sm font-bold text-[#a34a30]">امکانات</span>
            <h2 className="mt-3 text-3xl font-extrabold text-[#2a1d26] sm:text-4xl">
              هرچه یک سالن برای مدیریت نوبت لازم دارد
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-gray-600 md:text-end">
            از تقویم و پیامک تا بیعانه و گزارش؛ کاملاً فارسی، راست‌به‌چپ و با تقویم شمسی.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#a34a30]/10 text-[#a34a30]">
                <feature.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-bold text-[#2a1d26]">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
