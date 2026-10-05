import { customerBookingText, independentBookingText, independentReminderText, servicesSummary, smsParts } from './sms.text.js';

describe('servicesSummary', () => {
  it('names the first service and counts the rest', () => {
    expect(servicesSummary(['کوتاهی مو'])).toBe('کوتاهی مو');
    expect(servicesSummary(['کوتاهی مو', 'براشینگ', 'رنگ مو'])).toBe('کوتاهی مو و ۲ خدمت دیگر');
    expect(servicesSummary([])).toBe('');
  });
});

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

describe('prepaid bookings', () => {
  it('the stylist hears it is prepaid, in one segment', async () => {
    const { stylistNewBookingText, smsParts } = await import('./sms.text.js');
    const t = stylistNewBookingText({ day: 'سه‌شنبه ۱۴ مهر', time: '۰۸:۰۰', customer: 'سارا احمدی', prepaid: true });
    expect(t).toBe('نوبت پیش‌پرداخت‌شده سارا احمدی، سه‌شنبه ۱۴ مهر ۰۸:۰۰؛ تایید کنید');
    expect(smsParts(t)).toBe(1);
    const home = stylistNewBookingText({ day: 'چهارشنبه ۲۹ اسفند', time: '۱۶:۳۰', customer: 'فاطمه‌زهرا حسین‌زاده خراسانی', homeVisit: true, prepaid: true });
    expect(home.startsWith('منزل ')).toBe(true);
    expect(smsParts(home)).toBe(1);
  });

  it('a cancelled prepaid booking tells the customer the money is back, in one segment', () => {
    const p = { day: 'چهارشنبه ۲۹ اسفند', time: '۱۶:۳۰' };
    const salon = customerBookingText('cancelled-customer', { ...p, salon: 'سالن زیبایی رز سفید شمال تهران', stylist: 'مریم' }, { refunded: true });
    expect(salon).toContain('پیش‌پرداخت به کیف پول برگشت');
    expect(smsParts(salon)).toBe(1);
    const indie = independentBookingText('cancelled-customer', { ...p, name: 'سارا' }, { refunded: true });
    expect(indie).toContain('پیش‌پرداخت به کیف پول برگشت');
    expect(smsParts(indie)).toBe(1);
    expect(customerBookingText('cancelled-customer', { ...p, salon: 'رز', stylist: 'مریم' })).not.toContain('پیش‌پرداخت');
  });
});
