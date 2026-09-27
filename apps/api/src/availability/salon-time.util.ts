// Salon-local wall-clock <-> real instant conversion. Slots are expressed as "minute of day in
// the salon's own timezone" (Salon.timezone, e.g. Asia/Tehran), while startAt/endAt are stored
// as real UTC instants — these helpers bridge the two without pulling in a tz library.

function wallClockParts(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Offset of `timeZone` from UTC at `instant`, in minutes (Asia/Tehran -> 210). */
export function timeZoneOffsetMinutes(timeZone: string, instant: Date): number {
  const p = wallClockParts(timeZone, instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/** The real instant of `minuteOfDay` on calendar day `dateKey` ("YYYY-MM-DD") in `timeZone`. */
export function salonWallTimeToInstant(dateKey: string, minuteOfDay: number, timeZone: string): Date {
  const naive = new Date(`${dateKey}T00:00:00.000Z`).getTime() + minuteOfDay * 60_000;
  const offset = timeZoneOffsetMinutes(timeZone, new Date(naive));
  return new Date(naive - offset * 60_000);
}

/** Calendar day ("YYYY-MM-DD") and minute of day of `instant` as seen in `timeZone`. */
export function instantToSalonWallTime(instant: Date, timeZone: string): { dateKey: string; minuteOfDay: number } {
  const p = wallClockParts(timeZone, instant);
  const dateKey = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return { dateKey, minuteOfDay: p.hour * 60 + p.minute };
}

/** Adds `days` calendar days to a "YYYY-MM-DD" key. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
