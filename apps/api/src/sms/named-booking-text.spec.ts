import { smsParts, stylistConfirmNudgeText, stylistNewBookingText, stylistStateNudgeText } from './sms.text.js';

// The stylist's texts must still say whose booking it is: drop the weekday, then the last name,
// before cutting the name («نوبت خ…، چهارشنبه ۶ آبان …» was sent on 2026-10-28).
describe('stylist booking texts keep the customer recognisable', () => {
  const long = { day: 'چهارشنبه ۶ آبان', time: '۰۸:۰۰', customer: 'خدیجه رحمانی' };

  it('state nudge: drops the weekday so the full name fits', () => {
    expect(stylistStateNudgeText(long)).toBe('نوبت خدیجه رحمانی، ۶ آبان ۰۸:۰۰ باز مانده؛ وضعیتش را در پنل مشخص کنید');
  });
  it('keeps the weekday when everything fits', () => {
    expect(stylistNewBookingText({ day: 'شنبه ۶ آبان', time: '۰۸:۰۰', customer: 'نگار' })).toBe('نوبت جدید نگار، شنبه ۶ آبان ۰۸:۰۰؛ در پنل نوبتت تایید کنید');
  });
  it('then falls back to the first name, and only then cuts it', () => {
    const t = stylistConfirmNudgeText({ ...long, customer: 'فاطمه‌زهرا حسین‌زاده خراسانی' });
    expect(t).toBe('نوبت فاطمه‌زهرا، ۶ آبان ۰۸:۰۰ هنوز تایید نشده؛ در پنل تایید کنید');
    const cut = stylistStateNudgeText({ ...long, customer: 'عبدالرحمن‌علی‌اکبرزاده خراسانی' });
    expect(cut).toContain('…');
    expect(cut.length).toBeLessThanOrEqual(70);
  });
  it('every variant stays one segment', () => {
    for (const homeVisit of [false, true]) for (const prepaid of [false, true]) {
      expect(smsParts(stylistNewBookingText({ ...long, customer: 'فاطمه‌زهرا حسین‌زاده خراسانی', homeVisit, prepaid }))).toBe(1);
    }
  });
});
