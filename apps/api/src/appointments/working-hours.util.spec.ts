import { fitsWorkingHours } from './working-hours.util.js';

const TZ = 'Asia/Tehran';
// 2026-09-26 is a Saturday (dayOfWeek 6). Tehran is UTC+03:30.
const saturday9to18 = [{ dayOfWeek: 6, startMinute: 9 * 60, endMinute: 18 * 60 }];
const at = (iso: string) => new Date(iso);

describe('fitsWorkingHours', () => {
  it('accepts an appointment inside the day', () => {
    // 10:00–10:45 Tehran = 06:30–07:15 UTC
    expect(fitsWorkingHours(saturday9to18, at('2026-09-26T06:30:00Z'), at('2026-09-26T07:15:00Z'), TZ)).toBe(true);
  });

  it('accepts one that ends exactly at closing time', () => {
    // 17:00–18:00 Tehran
    expect(fitsWorkingHours(saturday9to18, at('2026-09-26T13:30:00Z'), at('2026-09-26T14:30:00Z'), TZ)).toBe(true);
  });

  it('rejects one that runs past closing time', () => {
    // 17:30–18:15 Tehran
    expect(fitsWorkingHours(saturday9to18, at('2026-09-26T14:00:00Z'), at('2026-09-26T14:45:00Z'), TZ)).toBe(false);
  });

  it('rejects one before opening', () => {
    // 08:30–09:15 Tehran
    expect(fitsWorkingHours(saturday9to18, at('2026-09-26T05:00:00Z'), at('2026-09-26T05:45:00Z'), TZ)).toBe(false);
  });

  it('rejects a day the stylist does not work', () => {
    // Sunday 10:00 Tehran
    expect(fitsWorkingHours(saturday9to18, at('2026-09-27T06:30:00Z'), at('2026-09-27T07:15:00Z'), TZ)).toBe(false);
  });

  it('uses the salon timezone, not UTC, to pick the day', () => {
    // 00:30 Saturday Tehran is still Friday 21:00 UTC — must be judged as Saturday.
    const lateHours = [{ dayOfWeek: 6, startMinute: 0, endMinute: 60 }];
    expect(fitsWorkingHours(lateHours, at('2026-09-25T21:00:00Z'), at('2026-09-25T21:30:00Z'), TZ)).toBe(true);
  });

  it('allows ending exactly at midnight but not crossing it', () => {
    const untilMidnight = [{ dayOfWeek: 6, startMinute: 22 * 60, endMinute: 24 * 60 }];
    // 23:00–24:00 Tehran Saturday
    expect(fitsWorkingHours(untilMidnight, at('2026-09-26T19:30:00Z'), at('2026-09-26T20:30:00Z'), TZ)).toBe(true);
    // 23:30–00:30
    expect(fitsWorkingHours(untilMidnight, at('2026-09-26T20:00:00Z'), at('2026-09-26T21:00:00Z'), TZ)).toBe(false);
  });
});
