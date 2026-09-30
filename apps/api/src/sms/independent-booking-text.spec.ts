import { customerBookingText, independentBookingText, smsParts } from './sms.text.js';

describe('independentBookingText', () => {
  const p = { day: 'سه‌شنبه ۷ مهر', time: '۱۶:۳۰', name: 'سارا ایلکا' };

  it('names only the stylist, in one segment', () => {
    expect(independentBookingText('booked-customer', p)).toBe('نوبتت: سه‌شنبه ۷ مهر ساعت ۱۶:۳۰ با سارا ایلکا ثبت شد');
    expect(independentBookingText('confirmed-customer', p)).toBe('نوبتت: سه‌شنبه ۷ مهر ساعت ۱۶:۳۰ با سارا ایلکا تایید شد');
    expect(independentBookingText('cancelled-customer', p)).toBe('نوبتت: سه‌شنبه ۷ مهر ساعت ۱۶:۳۰ با سارا ایلکا لغو شد');
    expect(independentBookingText('rescheduled-customer', p)).toBe('نوبتت: به سه‌شنبه ۷ مهر ساعت ۱۶:۳۰ با سارا ایلکا منتقل شد');
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
