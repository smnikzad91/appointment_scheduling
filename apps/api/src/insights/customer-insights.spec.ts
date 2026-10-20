import { computeCustomerInsights, type InsightAppointment } from './customer-insights.js';

const TZ = 'Asia/Tehran';
const at = (iso: string) => new Date(`${iso}+03:30`); // Tehran wall time
const NOW = at('2026-10-20T20:00:00');
const FROM = at('2026-07-23T00:00:00');

function appt(over: Partial<InsightAppointment> = {}): InsightAppointment {
  return {
    customerId: 'c1',
    customerName: 'نگار',
    startAt: at('2026-10-17T16:00:00'), // a Saturday
    createdAt: at('2026-10-15T10:00:00'),
    status: 'COMPLETED',
    priceToman: 500_000,
    chargedToman: 500_000,
    services: [{ serviceId: 'cut', name: 'کوتاهی مو', priceToman: 500_000 }],
    ...over,
  };
}

const run = (appointments: InsightAppointment[], extra: Partial<Parameters<typeof computeCustomerInsights>[0]> = {}) =>
  computeCustomerInsights({ appointments, firstVisitAt: new Map(), cohortVisits: [], firstCompletedAt: new Map(), timeZone: TZ, from: FROM, now: NOW, ...extra });

describe('computeCustomerInsights', () => {
  it('counts outcomes and rates', () => {
    const r = run([appt(), appt({ status: 'NO_SHOW' }), appt({ status: 'CANCELLED' }), appt({ status: 'CONFIRMED' })]);
    expect(r.totals).toMatchObject({ bookings: 4, completed: 1, noShow: 1, cancelled: 1, unmarked: 1, cancelRate: 25, noShowRate: 50 });
  });

  it('puts bookings on a Saturday-first weekday × hour grid in the salon timezone', () => {
    const r = run([appt()]);
    expect(r.byWeekday[0]).toBe(1); // شنبه
    expect(r.byHour[16]).toBe(1);
    expect(r.grid[0][16]).toBe(1);
  });

  it('splits a completed booking’s received amount over its services by price', () => {
    const r = run([
      appt({
        chargedToman: 900_000,
        priceToman: 1_000_000,
        services: [
          { serviceId: 'cut', name: 'کوتاهی مو', priceToman: 250_000 },
          { serviceId: 'color', name: 'رنگ مو', priceToman: 750_000 },
        ],
      }),
      appt({ status: 'CONFIRMED' }),
    ]);
    const color = r.services.find((s) => s.serviceId === 'color')!;
    const cut = r.services.find((s) => s.serviceId === 'cut')!;
    expect(color.revenueToman).toBe(675_000);
    expect(cut).toMatchObject({ bookings: 2, revenueToman: 225_000 }); // the unmarked one adds a booking, no revenue
    expect(color.revenueShare).toBe(75);
    expect(r.totals.revenueToman).toBe(900_000);
  });

  it('new = first booking ever is inside the window', () => {
    const r = run([appt({ customerId: 'old' }), appt({ customerId: 'new' }), appt({ customerId: 'new', startAt: at('2026-10-19T12:00:00') })], {
      firstVisitAt: new Map([['old', at('2025-01-01T10:00:00')], ['new', at('2026-10-18T16:00:00')]]),
    });
    expect(r.customers).toMatchObject({ total: 2, new: 1, returning: 1, repeatInWindow: 1, avgVisits: 1.5 });
  });

  it('lead time in salon-local days', () => {
    const r = run([
      appt({ createdAt: at('2026-10-17T09:00:00') }), // same day
      appt({ createdAt: at('2026-10-15T09:00:00') }), // 2 days
      appt({ createdAt: at('2026-10-01T09:00:00') }), // 17 days
    ]);
    expect(r.leadTime.buckets).toEqual({ sameDay: 1, upTo3Days: 1, upTo7Days: 0, moreThan7Days: 1 });
    expect(r.leadTime.medianHours).toBe(55);
  });

  it('lists customers who miss bookings', () => {
    const r = run([
      appt({ customerId: 'x', customerName: 'سارا', status: 'NO_SHOW' }),
      appt({ customerId: 'x', customerName: 'سارا', status: 'NO_SHOW' }),
      appt({ customerId: 'y', status: 'CANCELLED' }),
      appt({ customerId: 'y', status: 'NO_SHOW' }),
    ]);
    expect(r.unreliable).toHaveLength(1);
    expect(r.unreliable[0]).toMatchObject({ name: 'سارا', noShows: 2, cancellations: 0, bookings: 2 });
  });

  it('retention cohorts count only customers who had the whole window to come back', () => {
    const first = at('2026-08-01T12:00:00'); // ~80 days before NOW
    const r = run([], {
      firstCompletedAt: new Map([['a', first], ['b', first]]),
      cohortVisits: [
        { customerId: 'a', startAt: first },
        { customerId: 'a', startAt: at('2026-08-20T12:00:00') }, // back after 19 days
        { customerId: 'b', startAt: first },
      ],
    });
    expect(r.cohorts).toHaveLength(6);
    const mordad = r.cohorts.find((c) => c.customers === 2)!;
    expect(mordad.month).toBe('مرداد ۱۴۰۵');
    expect(mordad.returned).toEqual({ d30: 50, d60: 50, d90: null });
  });

  it('gives time tips only with enough bookings, and names the busiest and quietest times', () => {
    expect(run([appt()]).tips.filter((t) => t.text.includes('پرکارترین'))).toHaveLength(0);
    const many: InsightAppointment[] = [];
    // Saturdays and Sundays 10:00–20:00; Saturday afternoons are busy
    for (let i = 0; i < 12; i++) many.push(appt({ customerId: `s${i}`, startAt: at('2026-10-17T16:00:00') }));
    for (let h = 10; h <= 20; h++) many.push(appt({ customerId: `u${h}`, startAt: at(`2026-10-18T${String(h).padStart(2, '0')}:00:00`) }));
    many.push(appt({ customerId: 'z', startAt: at('2026-10-17T10:00:00') }), appt({ customerId: 'z2', startAt: at('2026-10-17T20:00:00') }));
    const tips = run(many).tips.map((t) => t.text);
    expect(tips).toContain('شنبه‌ها ساعت ۱۵ تا ۱۷ پرکارترین زمان شماست.');
    expect(tips.some((t) => t.startsWith('شنبه‌ها ساعت ۱۱ تا ۱۴ کم‌کارترین'))).toBe(true);
  });

  it('names a service that makes a big share of revenue', () => {
    const r = run([
      appt({ services: [{ serviceId: 'color', name: 'رنگ مو', priceToman: 500_000 }] }),
      appt({ chargedToman: 100_000, services: [{ serviceId: 'cut', name: 'کوتاهی مو', priceToman: 100_000 }] }),
    ]);
    expect(r.tips.map((t) => t.text)).toContain('«رنگ مو» ۸۳٪ درآمد شما را می‌سازد.');
  });
});
