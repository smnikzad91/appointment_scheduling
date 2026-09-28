import Link from "next/link";
import { Check } from "lucide-react";
import SectionHead from "./SectionHead";

const PLANS = [
  {
    name: "پایه",
    recommended: false,
    features: ["یک آرایشگر", "صفحه رزرو آنلاین و لینک اختصاصی", "[تعداد] پیامک یادآوری در ماه"],
    cta: { label: "انتخاب پلن", href: "/signup-salon" },
  },
  {
    name: "حرفه‌ای",
    recommended: true,
    features: [
      "تا [تعداد] آرایشگر با اپ اختصاصی",
      "بیعانه آنلاین با درگاه بانکی",
      "پرونده مشتری و گزارش‌ها",
      "[تعداد] پیامک یادآوری در ماه",
    ],
    cta: { label: "انتخاب پلن", href: "/signup-salon" },
  },
  {
    name: "چندشعبه",
    recommended: false,
    features: ["چند شعبه با مدیریت یکجا", "سطح دسترسی برای مدیر و پذیرش", "گزارش تجمیعی همه شعبه‌ها"],
    cta: { label: "تماس با ما", href: "/contact" },
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead center kicker="تعرفه‌ها" title="متناسب با اندازه سالن شما" lead="[مدت دوره آزمایشی] روز استفاده رایگان از همه امکانات" />

        <div className="mt-14 grid items-stretch gap-5 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`g-reveal relative flex flex-col rounded-3xl p-8 transition duration-300 hover:-translate-y-1 ${
                plan.recommended ? "g-glass g-glow-border shadow-[0_30px_80px_-30px_rgb(242_135_106/0.55)]" : "g-glass-soft hover:border-g-line-strong"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 right-8 rounded-full bg-[image:var(--g-gradient)] px-3 py-1 text-xs font-black text-[#1a0f14]">
                  پیشنهادی
                </span>
              )}
              <h3 className="text-lg font-bold text-g-ink">{plan.name}</h3>
              <p className="mt-3 text-3xl font-black text-g-ink">
                [قیمت] <span className="text-sm font-normal text-g-faint">تومان / ماه</span>
              </p>

              <ul className="mt-7 flex flex-1 flex-col gap-3 text-sm text-g-muted">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-g-accent" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href={plan.cta.href} className={`g-btn mt-8 h-12 text-sm ${plan.recommended ? "g-btn-primary" : "g-btn-ghost"}`}>
                {plan.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
