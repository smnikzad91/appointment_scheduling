import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { toPersianDigits } from "./persian";

export function toJalali(date: Date): DateObject {
  return new DateObject({ date, calendar: persian, locale: persian_fa });
}

/** ISO "YYYY-MM-DD" (Gregorian, UTC-safe) key used internally as the booking date identifier. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Friday is the weekend in Iran. JS Date#getDay(): 0=Sunday..6=Saturday, so Friday === 5. */
export function isWeekend(date: Date): boolean {
  return date.getDay() === 5;
}

export interface DateStripDay {
  dateKey: string;
  date: Date;
  weekdayName: string; // e.g. "شنبه"
  jalaliDay: string; // Persian-digit day-of-month, e.g. "۱۴"
  jalaliMonth: string; // e.g. "مهر"
  isToday: boolean;
  isWeekend: boolean;
}

/** Builds the next `count` days (including today) for the horizontal date strip. */
export function getUpcomingDays(count = 14, from: Date = new Date()): DateStripDay[] {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const days: DateStripDay[] = [];

  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const jalali = toJalali(date);

    days.push({
      dateKey: toDateKey(date),
      date,
      weekdayName: jalali.weekDay.name,
      jalaliDay: toPersianDigits(jalali.day),
      jalaliMonth: jalali.month.name,
      isToday: i === 0,
      isWeekend: isWeekend(date),
    });
  }

  return days;
}

export function formatJalaliFull(date: Date): string {
  return toJalali(date).format("dddd D MMMM");
}

/** JS Date#getDay() (0=Sunday..6=Saturday) -> Persian weekday name. */
export const PERSIAN_WEEKDAY_NAMES: Record<number, string> = {
  0: "یکشنبه",
  1: "دوشنبه",
  2: "سه‌شنبه",
  3: "چهارشنبه",
  4: "پنجشنبه",
  5: "جمعه",
  6: "شنبه",
};

/** Iranian week order for display: starts Saturday, ends Friday (the weekend). */
export const WEEK_ORDER_SATURDAY_FIRST = [6, 0, 1, 2, 3, 4, 5];
