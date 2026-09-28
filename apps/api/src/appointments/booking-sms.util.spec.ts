import { bookingSmsText } from './booking-sms.util.js';

describe('bookingSmsText', () => {
  it('shows the Persian date and time in the salon time zone', () => {
    const text = bookingSmsText({
      salonName: 'سالن رز',
      stylistName: 'مریم',
      startAt: new Date('2026-09-29T11:00:00Z'), // 14:30 in Tehran
      timeZone: 'Asia/Tehran',
    });
    expect(text).toBe('نوبت شما در سالن رز برای سه‌شنبه ۷ مهر ساعت ۱۴:۳۰ با مریم ثبت شد.');
  });
});
