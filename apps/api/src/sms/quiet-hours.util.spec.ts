import { maySendNow, parseQuietHours, quietUntil } from './quiet-hours.util.js';

const TZ = 'Asia/Tehran'; // UTC+3:30, no DST
const tehran = (iso: string) => new Date(`${iso}+03:30`);
const W = parseQuietHours(undefined);

describe('quiet hours', () => {
  it('parses the setting, falling back to 22:00-08:00', () => {
    expect(W).toEqual({ start: 22 * 60, end: 8 * 60 });
    expect(parseQuietHours('23:30-07:00')).toEqual({ start: 1410, end: 420 });
    expect(parseQuietHours('garbage')).toEqual(W);
    expect(parseQuietHours('off')).toEqual({ start: 0, end: 0 });
  });

  it('is quiet from 22:00 to 08:00 salon time, ending at 08:00 the right day', () => {
    expect(quietUntil(tehran('2026-10-05T21:59:00'), TZ, W)).toBeNull();
    expect(quietUntil(tehran('2026-10-05T22:00:00'), TZ, W)).toEqual(tehran('2026-10-06T08:00:00'));
    expect(quietUntil(tehran('2026-10-06T02:00:00'), TZ, W)).toEqual(tehran('2026-10-06T08:00:00'));
    expect(quietUntil(tehran('2026-10-06T08:00:00'), TZ, W)).toBeNull();
    expect(quietUntil(tehran('2026-10-06T02:00:00'), TZ, parseQuietHours('off'))).toBeNull();
  });

  it('lets a text through at night only for a booking that starts before quiet hours end', () => {
    const night = tehran('2026-10-06T02:00:00');
    expect(maySendNow(night, TZ, tehran('2026-10-06T07:30:00'), W)).toBe(true);
    expect(maySendNow(night, TZ, tehran('2026-10-06T10:00:00'), W)).toBe(false);
    expect(maySendNow(tehran('2026-10-06T12:00:00'), TZ, tehran('2026-10-07T10:00:00'), W)).toBe(true);
  });
});
