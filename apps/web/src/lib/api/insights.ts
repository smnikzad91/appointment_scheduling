import { salonApiFetch } from "./salonApiClient";

// The owner panel's analytics (apps/api src/insights): «آمار بازدید» from the public page's visit
// log and «آنالیز رفتار مشتری» from past appointments. Windows end now and start at a salon-local
// midnight.

export const VISIT_RANGES = [7, 30, 90] as const;
export type VisitRange = (typeof VISIT_RANGES)[number];
export const CUSTOMER_RANGES = [30, 90, 365] as const;
export type CustomerRange = (typeof CUSTOMER_RANGES)[number];

export interface Breakdown {
  /** referrers: "direct", "nobatet" (another page of this site), a host (l.instagram.com…) or a type; devices: mobile/desktop/tablet */
  key: string;
  views: number;
  visitors: number;
}

export interface VisitInsights {
  slug: string;
  days: VisitRange;
  from: string;
  to: string;
  totals: { views: number; visitors: number };
  /** the window of the same length just before */
  previous: { views: number; visitors: number; conversion: number };
  today: { views: number; visitors: number };
  liveVisitors: number;
  liveMinutes: number;
  perDay: { day: string; views: number; visitors: number }[];
  referrers: Breakdown[];
  devices: Breakdown[];
  funnel: { opened: number; openedVisitors: number; done: number; doneVisitors: number };
  /** percent of unique visitors who finished a booking */
  conversion: number;
}

export interface CustomerInsights {
  from: string;
  to: string;
  totals: { bookings: number; completed: number; cancelled: number; noShow: number; unmarked: number; cancelRate: number; noShowRate: number; revenueToman: number };
  /** non-cancelled bookings by salon-local hour 0–23 */
  byHour: number[];
  /** Saturday-first */
  byWeekday: number[];
  /** [weekday Saturday-first][hour] */
  grid: number[][];
  services: { serviceId: string; name: string; bookings: number; revenueToman: number; revenueShare: number }[];
  customers: { total: number; new: number; returning: number; repeatInWindow: number; avgVisits: number };
  leadTime: { avgHours: number; medianHours: number; buckets: { sameDay: number; upTo3Days: number; upTo7Days: number; moreThan7Days: number } };
  unreliable: { customerId: string; name: string; noShows: number; cancellations: number; bookings: number; lastAt: string }[];
  /** by the month of a customer's first completed visit: percent back within 30/60/90 days (null = too soon to tell) */
  cohorts: { month: string; customers: number; returned: { d30: number | null; d60: number | null; d90: number | null } }[];
  tips: { tone: "good" | "warn" | "info"; text: string }[];
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export function getVisitInsights(token: string, days: VisitRange) {
  return salonApiFetch<VisitInsights>(`/salons/mine/insights/visits?days=${days}`, { headers: auth(token) });
}

export function getCustomerInsights(token: string, days: CustomerRange) {
  return salonApiFetch<CustomerInsights>(`/salons/mine/insights/customers?days=${days}`, { headers: auth(token) });
}
