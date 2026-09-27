import { dateKeyToDate, formatJalaliFull } from "./jalali";
import { formatMinutesAsClock } from "./persian";

// apps/api stores appointment/time-off times as real UTC instants, but slots, working hours and
// the date strip are salon-local wall-clock time (Salon.timezone). Everything that crosses that
// boundary goes through here — never format an API instant with the browser's own timezone.
// Mirrors apps/api/src/availability/salon-time.util.ts.

/** Every salon is in Iran today; used where the API response doesn't carry the salon's timezone. */
export const DEFAULT_SALON_TIME_ZONE = "Asia/Tehran";

function wallClockParts(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function timeZoneOffsetMinutes(timeZone: string, instant: Date): number {
  const p = wallClockParts(timeZone, instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/** The real instant of `minuteOfDay` on `dateKey` ("YYYY-MM-DD") in the salon's timezone. */
export function salonWallTimeToInstant(dateKey: string, minuteOfDay: number, timeZone = DEFAULT_SALON_TIME_ZONE): Date {
  const naive = new Date(`${dateKey}T00:00:00.000Z`).getTime() + minuteOfDay * 60_000;
  const offset = timeZoneOffsetMinutes(timeZone, new Date(naive));
  return new Date(naive - offset * 60_000);
}

export interface SalonWallTime {
  dateKey: string; // "YYYY-MM-DD"
  minuteOfDay: number;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday, same as WorkingHour.dayOfWeek
}

/** How `instant` (an API ISO string or Date) reads on the salon's wall clock. */
export function toSalonWallTime(instant: Date | string, timeZone = DEFAULT_SALON_TIME_ZONE): SalonWallTime {
  const p = wallClockParts(timeZone, new Date(instant));
  const dateKey = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return {
    dateKey,
    minuteOfDay: p.hour * 60 + p.minute,
    dayOfWeek: new Date(`${dateKey}T00:00:00.000Z`).getUTCDay(),
  };
}

/** Adds `days` calendar days to a "YYYY-MM-DD" key. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** e.g. "شنبه ۵ مهر" — the salon-local calendar day of an API instant. */
export function formatSalonDate(instant: Date | string, timeZone = DEFAULT_SALON_TIME_ZONE): string {
  return formatJalaliFull(dateKeyToDate(toSalonWallTime(instant, timeZone).dateKey));
}

/** e.g. "شنبه ۵ مهر ساعت ۰۹:۳۰" — salon-local date and time of an API instant. */
export function formatSalonDateTime(instant: Date | string, timeZone = DEFAULT_SALON_TIME_ZONE): string {
  const wall = toSalonWallTime(instant, timeZone);
  return `${formatJalaliFull(dateKeyToDate(wall.dateKey))} ساعت ${formatMinutesAsClock(wall.minuteOfDay)}`;
}
