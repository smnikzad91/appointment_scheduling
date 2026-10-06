import { toPersianDigits } from "@/lib/persian";

/** A pricing plan as /api/admin/pricing sends it and the landing page renders it. */
export interface PricingPlanData {
  id: string;
  name: string;
  description: string | null;
  /** null = negotiated ("توافقی"), 0 = free */
  monthlyPriceToman: number | null;
  /** Active stylists a salon on this plan may have; null = unlimited */
  maxStylists: number | null;
  /** Reminder SMS per Jalali month; null = none included (no line on the site) */
  smsPerMonth: number | null;
  features: string[];
  recommended: boolean;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  active: boolean;
  /** Admin listing only: salons currently on this plan */
  salonCount?: number;
}

export interface PricingSettingsData {
  trialDays: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettingsData = { trialDays: 0 };

export const PLAN_LIMITS = {
  name: 40,
  description: 160,
  feature: 120,
  features: 12,
  ctaLabel: 30,
  ctaHref: 300,
  maxPrice: 1_000_000_000,
  maxCount: 100_000,
  maxTrialDays: 365,
};

function groupedPersian(n: number): string {
  return toPersianDigits(n.toLocaleString("en-US").replace(/,/g, "٬"));
}

/** The price line's number part; the landing page adds «تومان / ماه» after a real amount. */
export function planPriceLabel(price: number | null): { amount: string; perMonth: boolean } {
  if (price === null) return { amount: "توافقی", perMonth: false };
  if (price === 0) return { amount: "رایگان", perMonth: false };
  return { amount: groupedPersian(price), perMonth: true };
}

/** Feature lines as the landing page lists them: the stylist and SMS limits first, then the free-text ones. */
export function planFeatureLines(plan: Pick<PricingPlanData, "maxStylists" | "smsPerMonth" | "features">): string[] {
  const lines: string[] = [];
  if (plan.maxStylists === null) lines.push("آرایشگر نامحدود");
  else if (plan.maxStylists === 1) lines.push("یک آرایشگر");
  else lines.push(`تا ${groupedPersian(plan.maxStylists)} آرایشگر`);
  if (plan.smsPerMonth) lines.push(`${groupedPersian(plan.smsPerMonth)} پیامک یادآوری در ماه`);
  return [...lines, ...plan.features];
}

/** Same-site paths or http(s) links only — never javascript: and friends. */
export function isSafeCtaHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//");
  return /^https?:\/\/[^\s]+$/i.test(href);
}
