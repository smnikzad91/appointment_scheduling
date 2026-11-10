import { prepaidOutcomeText, smsParts } from './sms.text.js';

describe('prepaidOutcomeText: a prepaid booking confirmed / cancelled by staff', () => {
  const p = { day: 'چهارشنبه ۱۴ آبان', time: '۰۸:۰۰', place: 'در سالن رز', amount: '۲۵۰٬۰۰۰', balance: '۱٬۲۵۰٬۰۰۰' };

  it('confirmed: the pre-payment taken and the balance', () => {
    expect(prepaidOutcomeText('confirmed', p)).toBe(
      'نوبتت چهارشنبه ۱۴ آبان ساعت ۰۸:۰۰ در سالن رز تایید شد.\nپیش‌پرداخت ۲۵۰٬۰۰۰ تومان از کیف پول کسر شد؛ موجودی: ۱٬۲۵۰٬۰۰۰ تومان',
    );
  });
  it('cancelled: the refund and the balance', () => {
    expect(prepaidOutcomeText('cancelled', { ...p, place: 'با سارا' })).toBe(
      'نوبتت چهارشنبه ۱۴ آبان ساعت ۰۸:۰۰ با سارا لغو شد.\nپیش‌پرداخت ۲۵۰٬۰۰۰ تومان به کیف پول برگشت؛ موجودی: ۱٬۲۵۰٬۰۰۰ تومان',
    );
  });
  it('at most two segments: a long salon name is cut, the money lines never', () => {
    const t = prepaidOutcomeText('cancelled', { ...p, place: 'در سالن زیبایی و آرایشی بانوان رز سفید شعبه شمال تهران', amount: '۱٬۲۵۰٬۰۰۰', balance: '۱۲٬۳۴۵٬۶۷۸' });
    expect(smsParts(t)).toBeLessThanOrEqual(2);
    expect(t).toContain('…');
    expect(t).toContain('پیش‌پرداخت ۱٬۲۵۰٬۰۰۰ تومان به کیف پول برگشت؛ موجودی: ۱۲٬۳۴۵٬۶۷۸ تومان');
  });
});
