import Link from "next/link";
import { Check, Gift, MessageSquareText } from "lucide-react";
import SectionHead from "./SectionHead";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";
import { planFeatureLines, planPriceLabel, SMS_BILLING_NOTE, trialBadge } from "@/lib/pricing";

// Plans and the trial length come from the database, edited at /admin/pricing. Each card says who
// it's for (an independent stylist or a salon), carries the free-trial badge, and the SMS note
// under the grid says SMS are paid from the wallet, never part of a plan.
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
  const lead = trialDays > 0 ? `${toPersianDigits(trialDays)} روز استفاده رایگان از همه امکانات پلنی که انتخاب می‌کنید` : undefined;
  const badge = trialBadge(trialDays);

  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead center kicker="تعرفه‌ها" title="متناسب با اندازه سالن شما" lead={lead} />

        <div className={`mt-14 grid items-stretch gap-5 ${GRID_COLS[Math.min(plans.length, 4)] ?? "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {plans.map((plan) => {
            const price = planPriceLabel(plan.monthlyPriceToman);
            const external = /^https?:/i.test(plan.ctaHref);
            // Sign-up preselects the plan whose button was pressed (and the independent-stylist form for theirs).
            const independent = plan.audience === "INDEPENDENT";
            const href =
              plan.ctaHref === "/signup-salon"
                ? `/signup-salon?${independent ? "type=independent&" : ""}plan=${encodeURIComponent(plan.id)}`
                : plan.ctaHref;
            const ctaClass = `g-btn mt-8 h-12 text-sm ${plan.recommended ? "g-btn-primary" : "g-btn-ghost"}`;
            return (
              <div
                key={plan.id}
                className={`g-reveal relative flex flex-col rounded-3xl p-8 transition duration-300 hover:-translate-y-1 ${
                  plan.recommended ? "g-glass g-glow-border shadow-[0_30px_80px_-30px_rgb(198_138_114/0.55)]" : "g-glass-soft hover:border-g-line-strong"
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 right-8 rounded-full bg-[image:var(--g-gradient)] px-3 py-1 text-xs font-black text-[#1a0f14]">
                    پیشنهاد ما
                  </span>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold tracking-wide text-g-faint">{independent ? "آرایشگر مستقل" : "سالن"}</span>
                  {badge && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-g-accent/30 bg-g-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-g-accent">
                      <Gift className="h-3 w-3" aria-hidden />
                      {badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-bold text-g-ink">{plan.name}</h3>
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
                  <Link href={href} className={ctaClass}>
                    {plan.ctaLabel}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <p className="g-reveal mx-auto mt-10 flex max-w-3xl items-start gap-2.5 rounded-2xl border border-g-line px-5 py-4 text-sm leading-7 text-g-muted">
          <MessageSquareText className="mt-1 h-4 w-4 shrink-0 text-g-accent" aria-hidden />
          {SMS_BILLING_NOTE}
        </p>
      </div>
    </section>
  );
}
