import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { toPersianDigits } from "./persian";
import { salonWallTimeToInstant, toSalonWallTime } from "./salonTime";
import { toDateKey } from "./jalali";

/** A reporting window for the accounting screens: one Jalali month, as salon-local instants. */
export interface AccountingPeriod {
  /** e.g. "مهر ۱۴۰۵" */
  label: string;
  /** Inclusive start / exclusive end, ISO instants (salon-local midnight). */
  from: string;
  to: string;
  /** 0 = the current month, -1 = last month … */
  offset: number;
}

/** The Jalali month `offset` months from the salon's current month. */
export function jalaliMonthPeriod(offset = 0, now: Date = new Date()): AccountingPeriod {
  // Start from the salon-local calendar date (noon, so no timezone can tip it into another day).
  const [y, m, d] = toSalonWallTime(now).dateKey.split("-").map(Number);
  const today = new DateObject({ date: new Date(y, m - 1, d, 12), calendar: persian, locale: persian_fa });
  const start = new DateObject(today).setDay(1).add(offset, "month");
  const end = new DateObject(start).add(1, "month");
  return {
    label: `${start.month.name} ${toPersianDigits(start.year)}`,
    from: salonWallTimeToInstant(toDateKey(start.toDate()), 0).toISOString(),
    to: salonWallTimeToInstant(toDateKey(end.toDate()), 0).toISOString(),
    offset,
  };
}
