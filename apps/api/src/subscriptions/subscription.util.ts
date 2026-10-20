import { addDaysToDateKey, instantToSalonWallTime, salonWallTimeToInstant } from "../availability/salon-time.util.js";

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

/** Customers can book online unless the salon's plan (trial or bought) has run out. */
export function onlineBookingOpen(salon: { planId: string | null; planExpiresAt: Date | null }, now = new Date()): boolean {
  return subscriptionStatus(salon, now) !== "expired";
}

const DAY_MS = 86_400_000;

/** End of a new salon's free trial, or null (no end date) when the trial is off. */
export function trialEnd(trialDays: number, now = new Date(), timeZone = "Asia/Tehran"): Date | null {
  if (trialDays <= 0) return null;
  // The end of the last day (23:59:59 salon-local), so «تا ۲۸ آبان» in the SMS means the whole day.
  const nextDay = addDaysToDateKey(instantToSalonWallTime(now, timeZone).dateKey, trialDays + 1);
  return new Date(salonWallTimeToInstant(nextDay, 0, timeZone).getTime() - 1000);
}

/** A bought month is 30 days. */
export const PURCHASE_MONTH_DAYS = 30;

/**
 * When a bought period starts: renewing the plan the salon is on extends it from its current end
 * (if still running); a new or different plan, or an expired one, starts now — the rest of a
 * different plan isn't carried over.
 */
export function purchaseStart(salon: { planId: string | null; planExpiresAt: Date | null }, planId: string, now = new Date()): Date {
  return salon.planId === planId && salon.planExpiresAt && salon.planExpiresAt > now ? salon.planExpiresAt : now;
}

export function purchaseEnd(start: Date, months: number): Date {
  return new Date(start.getTime() + months * PURCHASE_MONTH_DAYS * DAY_MS);
}

/**
 * Switching plans: what's unused of the running plan's bought periods, pro rata by time (whole
 * toman, rounded down). Periods already over, or not started (a renewal queued after the current
 * one), count in full or not at all accordingly.
 */
export function unusedPurchaseCredit(purchases: { amountToman: number; startsAt: Date; endsAt: Date }[], now = new Date()): number {
  let credit = 0;
  for (const p of purchases) {
    const length = p.endsAt.getTime() - p.startsAt.getTime();
    if (length <= 0 || p.endsAt <= now) continue;
    const unused = p.endsAt.getTime() - Math.max(now.getTime(), p.startsAt.getTime());
    credit += Math.floor((p.amountToman * unused) / length);
  }
  return credit;
}
