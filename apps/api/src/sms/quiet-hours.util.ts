import { addDaysToDateKey, instantToSalonWallTime, salonWallTimeToInstant } from "../availability/salon-time.util.js";

/**
 * Quiet hours for SMS that can wait (the stylist's "new booking" and "still unconfirmed" texts):
 * salon-local, `SMS_QUIET_HOURS` in apps/api/.env as "HH:MM-HH:MM", default 22:00-08:00; a window
 * may cross midnight. Login codes, the 1-hour reminders and the customer's book/move/cancel texts
 * are never held back.
 */
export const DEFAULT_QUIET_HOURS = "22:00-08:00";

export interface QuietWindow {
  /** Minutes after salon-local midnight. start === end means no quiet hours. */
  start: number;
  end: number;
}

const toMinutes = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

/** "22:00-08:00" → {start: 1320, end: 480}; "off" → no quiet hours; anything unparsable → the default. */
export function parseQuietHours(value: string | undefined): QuietWindow {
  const raw = value?.trim() || DEFAULT_QUIET_HOURS;
  if (raw === "off") return { start: 0, end: 0 };
  const [a, b] = raw.split("-");
  const start = a === undefined ? null : toMinutes(a);
  const end = b === undefined ? null : toMinutes(b);
  if (start === null || end === null) return parseQuietHours(DEFAULT_QUIET_HOURS);
  return { start, end };
}

/**
 * If `now` falls in the salon's quiet hours, the instant they end (the next allowed send time);
 * otherwise null (send now).
 */
export function quietUntil(now: Date, timeZone: string, w: QuietWindow): Date | null {
  if (w.start === w.end) return null;
  const { dateKey, minuteOfDay: m } = instantToSalonWallTime(now, timeZone);
  const crossesMidnight = w.start > w.end;
  const quiet = crossesMidnight ? m >= w.start || m < w.end : m >= w.start && m < w.end;
  if (!quiet) return null;
  // Ends later today, unless we're in the evening part of a window that ends tomorrow morning.
  const endDay = crossesMidnight && m >= w.start ? addDaysToDateKey(dateKey, 1) : dateKey;
  return salonWallTimeToInstant(endDay, w.end, timeZone);
}

/**
 * Whether a text about a booking may go out now: outside quiet hours, or — inside them — when the
 * booking starts before they end (it can't usefully wait until morning).
 */
export function maySendNow(now: Date, timeZone: string, startAt: Date, w: QuietWindow): boolean {
  const until = quietUntil(now, timeZone, w);
  return until === null || startAt <= until;
}
