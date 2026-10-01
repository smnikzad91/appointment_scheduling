import { customerBookingText, independentBookingText, independentReminderText, smsParts } from './sms.text.js';

describe('independentReminderText', () => {
  it('names the services and the first name, never the business', () => {
    expect(independentReminderText({ time: '۰۹:۰۰', services: 'ترمیم ناخن ژل(کوتاه)', name: 'سارا' })).toBe('یادآوری نوبتت: ساعت ۰۹:۰۰ ترمیم ناخن ژل(کوتاه) با سارا');
  });
  it('cuts the services, not the time, to fit one segment', () => {
    const t = independentReminderText({ time: '۰۹:۰۰', services: 'ژلیش ناخن پا، ژلیش ناخن (کوتاه)، کاشت ناخن، طراحی ناخن', name: 'سارا' });
    expect(smsParts(t)).toBe(1);
    expect(t).toMatch(/^یادآوری نوبتت: ساعت ۰۹:۰۰ .+… با سارا$/);
  });
});

describe('independentBookingText', () => {
  const p = { day: 'سه‌شنبه ۷ مهر', time: '۱۶:۳۰', name: 'سارا' };

  it('names only the stylist, in one segment', () => {
    expect(independentBookingText('booked-customer', p)).toBe('نوبتت: سه‌شنبه ۷ مهر ساعت ۱۶:۳۰ با سارا ثبت شد');
    expect(independentBookingText('confirmed-customer', p)).toBe('نوبتت: سه‌شنبه ۷ مهر ساعت ۱۶:۳۰ با سارا تایید شد');
    expect(independentBookingText('cancelled-customer', p)).toBe('نوبتت: سه‌شنبه ۷ مهر ساعت ۱۶:۳۰ با سارا لغو شد');
    expect(independentBookingText('rescheduled-customer', p)).toBe('نوبتت: به سه‌شنبه ۷ مهر ساعت ۱۶:۳۰ با سارا منتقل شد');
  });

  it('shortens a long name rather than the date or time', () => {
    const t = independentBookingText('rescheduled-customer', { ...p, day: 'چهارشنبه ۲۹ اسفند', name: 'فاطمه‌زهرا حسین‌زاده خراسانی' });
    expect(smsParts(t)).toBe(1);
    expect(t).toContain('چهارشنبه ۲۹ اسفند ساعت ۱۶:۳۰ با ');
    expect(t).toContain('…');
  });

  it("leaves the salons' wording alone", () => {
    expect(customerBookingText('booked-customer', { day: p.day, time: p.time, salon: 'رز', stylist: 'مریم' })).toBe(
      'نوبتت: سه‌شنبه ۷ مهر ساعت ۱۶:۳۰ در رز با مریم ثبت شد',
    );
  });
});
