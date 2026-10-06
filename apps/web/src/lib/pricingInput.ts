import { isSafeCtaHref, PLAN_LIMITS, type PricingPlanData } from "@/lib/pricing";

export type PlanInput = Omit<PricingPlanData, "id" | "sortOrder">;

/** Validates a create/update body from /admin/pricing; returns an English error for the route to send. */
export function parsePlanInput(body: unknown): { data: PlanInput } | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Invalid plan" };
  const b = body as Record<string, unknown>;

  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const count = (v: unknown, max: number): number | null | undefined => {
    if (v === null || v === undefined || v === "") return null;
    return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : undefined;
  };

  const name = text(b.name);
  if (!name || name.length > PLAN_LIMITS.name) return { error: "Plan name is required (max 40 characters)" };

  const description = text(b.description) || null;
  if (description && description.length > PLAN_LIMITS.description) return { error: "Description is too long" };

  const monthlyPriceToman = count(b.monthlyPriceToman, PLAN_LIMITS.maxPrice);
  if (monthlyPriceToman === undefined) return { error: "Invalid price" };
  const maxStylists = count(b.maxStylists, PLAN_LIMITS.maxCount);
  if (maxStylists === undefined || maxStylists === 0) return { error: "Invalid stylist limit" };
  const smsPerMonth = count(b.smsPerMonth, PLAN_LIMITS.maxCount);
  if (smsPerMonth === undefined) return { error: "Invalid SMS count" };

  if (!Array.isArray(b.features)) return { error: "Invalid features" };
  const features = b.features.map(text).filter(Boolean);
  if (features.length > PLAN_LIMITS.features || features.some((f) => f.length > PLAN_LIMITS.feature)) {
    return { error: "Too many or too long features" };
  }

  const ctaLabel = text(b.ctaLabel);
  if (!ctaLabel || ctaLabel.length > PLAN_LIMITS.ctaLabel) return { error: "Button text is required (max 30 characters)" };
  const ctaHref = text(b.ctaHref);
  if (!ctaHref || ctaHref.length > PLAN_LIMITS.ctaHref || !isSafeCtaHref(ctaHref)) {
    return { error: "Button link must be a site path (/…) or an http(s) URL" };
  }

  return {
    data: {
      name,
      description,
      monthlyPriceToman,
      maxStylists,
      smsPerMonth,
      features,
      recommended: b.recommended === true,
      ctaLabel,
      ctaHref,
      active: b.active !== false,
    },
  };
}
