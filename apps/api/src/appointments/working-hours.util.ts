import { addDaysToDateKey, instantToSalonWallTime } from "../availability/salon-time.util.js";

export interface WorkingHourRange {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startMinute: number;
  endMinute: number;
}

/**
 * Whether [startAt, endAt) falls entirely inside the stylist's working hours for that day, read in
 * the salon's timezone. An appointment may end exactly at midnight (minute 1440) but not run past it.
 */
export function fitsWorkingHours(hours: WorkingHourRange[], startAt: Date, endAt: Date, timeZone: string): boolean {
  const start = instantToSalonWallTime(startAt, timeZone);
  const end = instantToSalonWallTime(endAt, timeZone);
  const dayOfWeek = new Date(`${start.dateKey}T00:00:00.000Z`).getUTCDay();
  const day = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!day) return false;

  let endMinute: number;
  if (end.dateKey === start.dateKey) endMinute = end.minuteOfDay;
  else if (end.minuteOfDay === 0 && end.dateKey === addDaysToDateKey(start.dateKey, 1)) endMinute = 24 * 60;
  else return false;

  return start.minuteOfDay >= day.startMinute && endMinute <= day.endMinute;
}
