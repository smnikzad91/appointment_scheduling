import { jalaliPeriod, subscriptionStatus, trialEnd } from './subscription.util.js';

describe('jalaliPeriod', () => {
  it('uses the Jalali month in the salon timezone', () => {
    expect(jalaliPeriod(new Date('2026-09-28T12:00:00Z'), 'Asia/Tehran')).toBe('1405-07');
    // 00:30 on 1 Farvardin in Tehran is still 20 March in UTC
    expect(jalaliPeriod(new Date('2026-03-20T21:00:00Z'), 'Asia/Tehran')).toBe('1405-01');
    expect(jalaliPeriod(new Date('2026-03-20T20:00:00Z'), 'Asia/Tehran')).toBe('1404-12');
  });
});

describe('subscriptionStatus', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  it('has no status without a plan', () => {
    expect(subscriptionStatus({ planId: null, planExpiresAt: null }, now)).toBe('none');
  });
  it('never expires without an end date', () => {
    expect(subscriptionStatus({ planId: 'p', planExpiresAt: null }, now)).toBe('active');
  });
  it('expires at the end date', () => {
    expect(subscriptionStatus({ planId: 'p', planExpiresAt: new Date('2026-10-02T00:00:00Z') }, now)).toBe('active');
    expect(subscriptionStatus({ planId: 'p', planExpiresAt: now }, now)).toBe('expired');
  });
});

describe('trialEnd', () => {
  it('adds the trial days, or no end date when the trial is off', () => {
    const now = new Date('2026-10-01T08:00:00Z');
    expect(trialEnd(14, now)).toEqual(new Date('2026-10-15T08:00:00Z'));
    expect(trialEnd(0, now)).toBeNull();
  });
});
