import Link from "next/link";
import { Check } from "lucide-react";
import SectionHead from "./SectionHead";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";
import { planFeatureLines, planPriceLabel } from "@/lib/pricing";

// Plans and the trial length come from the database, edited at /admin/pricing.
const GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1 max-w-md mx-auto",
  2: "sm:grid-cols-2 max-w-3xl mx-auto",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export default async function Pricing() {
  const [plans, settings] = await Promise.all([
    prisma.pricingPlan.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.pricingSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (plans.length === 0) return null;

  const trialDays = settings?.trialDays ?? 0;
  const lead = trialDays > 0 ? `${toPersianDigits(trialDays)} روز استفاده رایگان از همه امکانات` : undefined;

  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead center kicker="تعرفه‌ها" title="متناسب با اندازه سالن شما" lead={lead} />

        <div className={`mt-14 grid items-stretch gap-5 ${GRID_COLS[Math.min(plans.length, 4)] ?? "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {plans.map((plan) => {
            const price = planPriceLabel(plan.monthlyPriceToman);
            const external = /^https?:/i.test(plan.ctaHref);
            const ctaClass = `g-btn mt-8 h-12 text-sm ${plan.recommended ? "g-btn-primary" : "g-btn-ghost"}`;
            return (
              <div
                key={plan.id}
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
                {plan.description && <p className="mt-1.5 text-sm leading-7 text-g-muted">{plan.description}</p>}
                <p className="mt-3 text-3xl font-black text-g-ink">
                  {price.amount}
                  {price.perMonth && <span className="text-sm font-normal text-g-faint"> تومان / ماه</span>}
                </p>

                <ul className="mt-7 flex flex-1 flex-col gap-3 text-sm text-g-muted">
                  {planFeatureLines(plan).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-g-accent" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>

                {external ? (
                  <a href={plan.ctaHref} target="_blank" rel="noopener noreferrer" className={ctaClass}>
                    {plan.ctaLabel}
                  </a>
                ) : (
                  <Link href={plan.ctaHref} className={ctaClass}>
                    {plan.ctaLabel}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
