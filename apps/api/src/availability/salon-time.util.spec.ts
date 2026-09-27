import { instantToSalonWallTime, salonWallTimeToInstant, timeZoneOffsetMinutes } from './salon-time.util.js';

describe('salon-time.util', () => {
  it('knows Tehran is UTC+03:30', () => {
    expect(timeZoneOffsetMinutes('Asia/Tehran', new Date('2026-09-27T12:00:00Z'))).toBe(210);
  });

  it('maps a Tehran wall-clock slot to the real instant', () => {
    // 09:00 in Tehran on 2026-09-27 is 05:30 UTC.
    expect(salonWallTimeToInstant('2026-09-27', 9 * 60, 'Asia/Tehran').toISOString()).toBe('2026-09-27T05:30:00.000Z');
  });

  it('maps local midnight to the previous UTC day', () => {
    expect(salonWallTimeToInstant('2026-09-27', 0, 'Asia/Tehran').toISOString()).toBe('2026-09-26T20:30:00.000Z');
  });

  it('reads an instant back as Tehran date + minute of day', () => {
    // 22:00 UTC on the 26th is already 01:30 on the 27th in Tehran.
    expect(instantToSalonWallTime(new Date('2026-09-26T22:00:00Z'), 'Asia/Tehran')).toEqual({
      dateKey: '2026-09-27',
      minuteOfDay: 90,
    });
  });

  it('round-trips', () => {
    const instant = salonWallTimeToInstant('2026-03-21', 17 * 60 + 30, 'Asia/Tehran');
    expect(instantToSalonWallTime(instant, 'Asia/Tehran')).toEqual({ dateKey: '2026-03-21', minuteOfDay: 17 * 60 + 30 });
  });
});
