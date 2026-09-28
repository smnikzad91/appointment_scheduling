import { appointmentSmsText } from './appointment-sms.util.js';

describe('appointmentSmsText', () => {
  const a = {
    salonName: 'سالن رز',
    stylistName: 'مریم',
    startAt: new Date('2026-09-29T11:00:00Z'), // 14:30 in Tehran
    timeZone: 'Asia/Tehran',
  };

  it('shows the Persian date and time in the salon time zone', () => {
    expect(appointmentSmsText('booked', a)).toBe('نوبت شما در سالن رز برای سه‌شنبه ۷ مهر ساعت ۱۴:۳۰ با مریم ثبت شد.');
  });

  it('has a reminder and a cancellation text', () => {
    expect(appointmentSmsText('reminder', a)).toBe('یادآوری: نوبت شما در سالن رز، سه‌شنبه ۷ مهر ساعت ۱۴:۳۰ با مریم.');
    expect(appointmentSmsText('cancelled', a)).toBe('نوبت شما در سالن رز برای سه‌شنبه ۷ مهر ساعت ۱۴:۳۰ لغو شد.');
  });
});
