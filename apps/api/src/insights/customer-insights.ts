import { addDaysToDateKey, instantToSalonWallTime } from "../availability/salon-time.util.js";

// Pure maths behind GET /salons/mine/insights/customers (no imports from Prisma, so it's unit-tested
// directly): booking patterns, services, new vs returning customers, lead time, cancellations and
// no-shows, monthly retention cohorts and a few plain-Persian takeaways.

export type InsightStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface InsightAppointment {
  customerId: string;
  customerName: string;
  startAt: Date;
  createdAt: Date;
  status: InsightStatus;
  priceToman: number;
  /** received amount once COMPLETED */
  chargedToman: number | null;
  services: { serviceId: string; name: string; priceToman: number }[];
}

export interface CohortVisit {
  customerId: string;
  startAt: Date;
}

/** Saturday-first, as the Iranian week. Index = (getUTCDay() + 1) % 7. */
export const WEEKDAYS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

/** Below this many bookings a takeaway about quiet or busy times would be noise. */
export const MIN_BOOKINGS_FOR_TIME_TIPS = 20;
const COHORT_MONTHS = 6;
const RETURN_WINDOWS = [30, 60, 90] as const;
const DAY_MS = 86_400_000;

const weekdayOf = (dateKey: string) => (new Date(`${dateKey}T00:00:00Z`).getUTCDay() + 1) % 7;
const faNum = (n: number) => n.toLocaleString("fa-IR");
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const hourRange = (from: number, to: number) => `${faNum(from)} تا ${faNum(to)}`;

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** A completed booking's received amount split over its services by their snapshot prices. */
function serviceRevenue(a: InsightAppointment): Map<string, number> {
  const out = new Map<string, number>();
  const total = a.chargedToman ?? a.priceToman;
  const listed = a.services.reduce((s, x) => s + x.priceToman, 0);
  for (const s of a.services) {
    const share = listed > 0 ? (total * s.priceToman) / listed : total / a.services.length;
    out.set(s.serviceId, (out.get(s.serviceId) ?? 0) + share);
  }
  return out;
}

export function computeCustomerInsights(input: {
  /** past appointments in the window: startAt in [from, now) */
  appointments: InsightAppointment[];
  /** each window customer's first non-cancelled booking at this salon, ever */
  firstVisitAt: Map<string, Date>;
  /** completed bookings since a little before the oldest cohort month, for the retention table */
  cohortVisits: CohortVisit[];
  /** each customer's first completed booking at this salon, ever (cohort customers) */
  firstCompletedAt: Map<string, Date>;
  timeZone: string;
  from: Date;
  now: Date;
}) {
  const { appointments, timeZone, from, now } = input;
  const local = (d: Date) => instantToSalonWallTime(d, timeZone);

  // ── Outcomes ──
  const count = (s: InsightStatus) => appointments.filter((a) => a.status === s).length;
  const completed = count("COMPLETED");
  const cancelled = count("CANCELLED");
  const noShow = count("NO_SHOW");
  const unmarked = count("PENDING") + count("CONFIRMED");
  const total = appointments.length;
  const live = appointments.filter((a) => a.status !== "CANCELLED");

  // ── When: weekday × hour grid of non-cancelled bookings ──
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const byHour = Array<number>(24).fill(0);
  const byWeekday = Array<number>(7).fill(0);
  for (const a of live) {
    const t = local(a.startAt);
    const h = Math.floor(t.minuteOfDay / 60);
    const w = weekdayOf(t.dateKey);
    grid[w][h]++;
    byHour[h]++;
    byWeekday[w]++;
  }

  // ── Services (bookings: every non-cancelled one; revenue: completed only) ──
  const services = new Map<string, { serviceId: string; name: string; bookings: number; revenueToman: number }>();
  for (const a of live) {
    const revenue = a.status === "COMPLETED" ? serviceRevenue(a) : null;
    for (const s of a.services) {
      const row = services.get(s.serviceId) ?? { serviceId: s.serviceId, name: s.name, bookings: 0, revenueToman: 0 };
      row.bookings++;
      row.revenueToman += revenue?.get(s.serviceId) ?? 0;
      services.set(s.serviceId, row);
    }
  }
  const revenueTotal = [...services.values()].reduce((s, x) => s + x.revenueToman, 0);
  const serviceList = [...services.values()]
    .map((s) => ({ ...s, revenueToman: Math.round(s.revenueToman), revenueShare: pct(s.revenueToman, revenueTotal) }))
    .sort((a, b) => b.bookings - a.bookings || b.revenueToman - a.revenueToman);

  // ── Customers: new (first booking ever falls in the window) vs returning ──
  const visitsPerCustomer = new Map<string, number>();
  for (const a of live) visitsPerCustomer.set(a.customerId, (visitsPerCustomer.get(a.customerId) ?? 0) + 1);
  let newCustomers = 0;
  for (const id of visitsPerCustomer.keys()) {
    const first = input.firstVisitAt.get(id);
    if (!first || first >= from) newCustomers++;
  }
  const customers = visitsPerCustomer.size;
  const repeatInWindow = [...visitsPerCustomer.values()].filter((n) => n >= 2).length;

  // ── Lead time: booked how long before the visit ──
  const leadHours = live.map((a) => Math.max(0, (a.startAt.getTime() - a.createdAt.getTime()) / 3_600_000));
  const leadBuckets = { sameDay: 0, upTo3Days: 0, upTo7Days: 0, moreThan7Days: 0 };
  for (const a of live) {
    const days = Math.round((Date.parse(local(a.startAt).dateKey) - Date.parse(local(a.createdAt).dateKey)) / DAY_MS);
    if (days <= 0) leadBuckets.sameDay++;
    else if (days <= 3) leadBuckets.upTo3Days++;
    else if (days <= 7) leadBuckets.upTo7Days++;
    else leadBuckets.moreThan7Days++;
  }

  // ── Customers who cancel or don't show up (cancellations can come from either side) ──
  const misses = new Map<string, { customerId: string; name: string; noShows: number; cancellations: number; bookings: number; lastAt: Date }>();
  for (const a of appointments) {
    const row = misses.get(a.customerId) ?? { customerId: a.customerId, name: a.customerName, noShows: 0, cancellations: 0, bookings: 0, lastAt: a.startAt };
    row.bookings++;
    if (a.status === "NO_SHOW") row.noShows++;
    if (a.status === "CANCELLED") row.cancellations++;
    if (a.startAt > row.lastAt) row.lastAt = a.startAt;
    misses.set(a.customerId, row);
  }
  const unreliable = [...misses.values()]
    .filter((m) => m.noShows >= 2 || m.noShows + m.cancellations >= 3)
    .sort((a, b) => b.noShows - a.noShows || b.cancellations - a.cancellations)
    .slice(0, 5)
    .map((m) => ({ ...m, lastAt: m.lastAt.toISOString() }));

  // ── Retention cohorts: customers by the (Jalali) month of their first completed visit ──
  const visitsByCustomer = new Map<string, Date[]>();
  for (const v of input.cohortVisits) {
    const list = visitsByCustomer.get(v.customerId) ?? [];
    list.push(v.startAt);
    visitsByCustomer.set(v.customerId, list);
  }
  const monthKey = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone, year: "numeric", month: "2-digit" });
  const monthParts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone, year: "numeric", month: "long" });
  /** «مهر ۱۴۰۵» (Intl puts the year first) */
  const monthLabel = { format: (d: Date) => ["month", "year"].map((t) => monthParts.formatToParts(d).find((p) => p.type === t)?.value).join(" ") };
  const keyOf = (d: Date) => monthKey.format(d);
  const cohortMonths: { key: string; label: string }[] = [];
  for (let d = new Date(now), i = 0; cohortMonths.length < COHORT_MONTHS && i < 400; i++, d = new Date(d.getTime() - DAY_MS)) {
    const key = keyOf(d);
    if (!cohortMonths.some((m) => m.key === key)) cohortMonths.push({ key, label: monthLabel.format(d) });
  }
  const cohorts = cohortMonths.reverse().map(({ key, label }) => {
    const members = [...input.firstCompletedAt.entries()].filter(([, first]) => keyOf(first) === key);
    const returned = Object.fromEntries(
      RETURN_WINDOWS.map((days) => {
        // only customers who've had the whole window to come back count
        const eligible = members.filter(([, first]) => first.getTime() + days * DAY_MS <= now.getTime());
        if (!eligible.length) return [`d${days}`, null];
        const back = eligible.filter(([id, first]) =>
          (visitsByCustomer.get(id) ?? []).some((t) => t > first && t.getTime() <= first.getTime() + days * DAY_MS),
        ).length;
        return [`d${days}`, pct(back, eligible.length)];
      }),
    ) as Record<"d30" | "d60" | "d90", number | null>;
    return { month: label, customers: members.length, returned };
  });

  // ── Takeaways ──
  const tips: { tone: "good" | "warn" | "info"; text: string }[] = [];
  if (live.length >= MIN_BOOKINGS_FOR_TIME_TIPS) {
    // busiest 2-hour window and quietest 3-hour window, within the hours and days the salon works
    const openHours = byHour.map((n, h) => (n > 0 ? h : -1)).filter((h) => h >= 0);
    const firstHour = openHours[0];
    const lastHour = openHours[openHours.length - 1];
    let peak = { w: 0, h: firstHour, n: -1 };
    let slow = { w: 0, h: firstHour, n: Infinity };
    for (let w = 0; w < 7; w++) {
      if (!byWeekday[w]) continue; // a day off
      for (let h = firstHour; h + 1 <= lastHour; h++) {
        const two = grid[w][h] + grid[w][h + 1];
        if (two > peak.n) peak = { w, h, n: two };
      }
      for (let h = firstHour; h + 2 <= lastHour; h++) {
        const three = grid[w][h] + grid[w][h + 1] + grid[w][h + 2];
        if (three < slow.n) slow = { w, h, n: three };
      }
    }
    if (peak.n > 0) tips.push({ tone: "info", text: `${WEEKDAYS_FA[peak.w]}‌ها ساعت ${hourRange(peak.h, peak.h + 2)} پرکارترین زمان شماست.` });
    if (slow.n !== Infinity && lastHour - firstHour >= 3)
      tips.push({ tone: "warn", text: `${WEEKDAYS_FA[slow.w]}‌ها ساعت ${hourRange(slow.h, slow.h + 3)} کم‌کارترین زمان است؛ برای این ساعت‌ها تخفیف یا پیشنهاد ویژه بگذارید.` });
  }
  const topRevenue = [...serviceList].sort((a, b) => b.revenueToman - a.revenueToman)[0];
  if (topRevenue && topRevenue.revenueShare >= 25 && serviceList.length > 1)
    tips.push({ tone: "good", text: `«${topRevenue.name}» ${faNum(Math.round(topRevenue.revenueShare))}٪ درآمد شما را می‌سازد.` });
  const noShowRate = pct(noShow, completed + noShow);
  if (completed + noShow >= 10 && noShowRate >= 10)
    tips.push({ tone: "warn", text: `${faNum(Math.round(noShowRate))}٪ مشتری‌ها سر نوبت نیامدند؛ پیش‌پرداخت آنلاین و پیامک یادآوری این را کم می‌کند.` });
  if (customers >= 10) {
    const returningShare = pct(customers - newCustomers, customers);
    tips.push(
      returningShare >= 50
        ? { tone: "good", text: `${faNum(Math.round(returningShare))}٪ مشتری‌های این دوره قبلاً هم پیش شما آمده بودند؛ مشتری وفادار دارید.` }
        : { tone: "info", text: `${faNum(Math.round(100 - returningShare))}٪ مشتری‌های این دوره تازه بودند؛ یادآوری نوبت بعدی کمک می‌کند برگردند.` },
    );
  }
  if (live.length >= 10 && leadBuckets.sameDay / live.length >= 0.4)
    tips.push({ tone: "info", text: `${faNum(Math.round(pct(leadBuckets.sameDay, live.length)))}٪ نوبت‌ها برای همان روز گرفته می‌شوند؛ چند ساعت خالی برای مشتری‌های لحظه آخری نگه دارید.` });

  return {
    from: from.toISOString(),
    to: now.toISOString(),
    totals: {
      bookings: total,
      completed,
      cancelled,
      noShow,
      unmarked,
      cancelRate: pct(cancelled, total),
      noShowRate,
      revenueToman: Math.round(revenueTotal),
    },
    byHour,
    byWeekday,
    grid,
    services: serviceList.slice(0, 10),
    customers: {
      total: customers,
      new: newCustomers,
      returning: customers - newCustomers,
      repeatInWindow,
      avgVisits: customers ? Math.round((live.length / customers) * 10) / 10 : 0,
    },
    leadTime: {
      avgHours: leadHours.length ? Math.round(leadHours.reduce((s, h) => s + h, 0) / leadHours.length) : 0,
      medianHours: Math.round(median(leadHours)),
      buckets: leadBuckets,
    },
    unreliable,
    cohorts,
    tips,
  };
}

export type CustomerInsights = ReturnType<typeof computeCustomerInsights>;

/** The first instant of the salon-local day `days - 1` days before today: a window of `days` days ending now. */
export function windowStart(now: Date, days: number, timeZone: string, toInstant: (dateKey: string) => Date): Date {
  return toInstant(addDaysToDateKey(instantToSalonWallTime(now, timeZone).dateKey, 1 - days));
}
