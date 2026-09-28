/** Jalali year-month ("1405-07") of an instant in the salon's timezone — the SMS allowance period. */
export function jalaliPeriod(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(at);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}`;
}

export type SubscriptionStatus = "none" | "active" | "expired";

/** "none" = no plan assigned (no limits); a plan with no end date never expires. */
export function subscriptionStatus(salon: { planId: string | null; planExpiresAt: Date | null }, now = new Date()): SubscriptionStatus {
  if (!salon.planId) return "none";
  return salon.planExpiresAt && salon.planExpiresAt <= now ? "expired" : "active";
}

const DAY_MS = 86_400_000;

/** End of a new salon's free trial, or null (no end date) when the trial is off. */
export function trialEnd(trialDays: number, now = new Date()): Date | null {
  return trialDays > 0 ? new Date(now.getTime() + trialDays * DAY_MS) : null;
}
