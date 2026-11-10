import { AppointmentsService } from './appointments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { WaitlistService } from '../waitlist/waitlist.service.js';
import type { SmsService } from '../sms/sms.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type { JwtPayload } from '../auth/auth.service.js';

// A prepaid online booking (50,000 toman held from the customer's wallet) cancelled or confirmed:
// who gets the money (owner's rule, 2026-10-30) and who gets an SMS.
const customer = { sub: 'cust-1', role: 'CUSTOMER' } as JwtPayload;
const owner = { sub: 'owner-1', role: 'SALON_OWNER' } as JwtPayload;
const stylistUser = { sub: 'sty-user-1', role: 'STYLIST' } as JwtPayload;
const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(status: 'PENDING' | 'CONFIRMED') {
  const moves: { userId: string; amount: number; kind?: string }[] = [];
  const row = {
    id: 'appt-1', status, salonId: 'salon-1', stylistId: 'sty-1', customerId: 'cust-1', services: [],
    startAt: new Date(Date.now() + 26 * 3600_000), prepaidToman: 50_000, prepaymentStatus: 'HELD', prepaymentStylistToman: 0,
    customerFirstName: null, customerLastName: null,
    salon: { name: 'سالن رز', timezone: 'Asia/Tehran', kind: 'SALON', ownerId: 'owner-1' },
    stylist: { userId: 'sty-user-1', displayName: 'مریم', user: { firstName: 'مریم', lastName: 'کاظمی', phone: '09350000000' } },
    customer: { firstName: 'نگار', lastName: 'رضایی', phone: '09121234567', walletBalance: 120_000 },
  };
  const tx = {
    salon: { findUniqueOrThrow: vi.fn().mockResolvedValue({ ownerId: 'owner-1' }) },
    stylist: { findUniqueOrThrow: vi.fn().mockResolvedValue({ userId: 'sty-user-1' }) },
    appointment: {
      updateMany: vi.fn(({ where, data }) => {
        if (where.prepaymentStatus !== row.prepaymentStatus || (where.status && where.status !== row.status)) return Promise.resolve({ count: 0 });
        Object.assign(row, data); // what the SMS read afterwards sees
        return Promise.resolve({ count: 1 });
      }),
      update: vi.fn(({ data }) => Promise.resolve({ ...row, ...data })),
    },
    $queryRaw: vi.fn((_s: TemplateStringsArray, amount: number, userId: string) => { moves.push({ userId, amount }); return Promise.resolve([{ walletBalance: 0 }]); }),
    walletTransaction: { create: vi.fn(({ data }) => { moves[moves.length - 1].kind = data.kind; return Promise.resolve(data); }) },
    stylistPayout: { create: vi.fn(), deleteMany: vi.fn() },
  };
  const prisma = {
    appointment: { findUnique: vi.fn().mockResolvedValue(row), update: vi.fn() },
    stylist: { findUnique: vi.fn().mockResolvedValue({ id: 'sty-1', userId: 'sty-user-1' }) },
    salon: { findUnique: vi.fn().mockResolvedValue({ id: 'salon-1', ownerId: 'owner-1' }) },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const sms = { send: vi.fn().mockResolvedValue(true) };
  const service = new AppointmentsService(
    prisma as unknown as PrismaService,
    { notify: vi.fn() } as unknown as NotificationsService,
    { notifyOpening: vi.fn() } as unknown as WaitlistService,
    sms as unknown as SmsService,
    { takeReminderSms: vi.fn().mockResolvedValue(false) } as unknown as SubscriptionsService,
  );
  const texts = () => Object.fromEntries(sms.send.mock.calls.map(([m, charge]) => [m.to, { kind: m.kind, text: m.text as string, evenInDebt: charge?.evenInDebt }]));
  return { service, moves, sms, texts };
}

describe('customer cancels a prepaid booking', () => {
  it('confirmed: refused without acceptPrepaymentLoss — the app must warn first', async () => {
    const { service, moves, sms } = setup('CONFIRMED');
    await expect(service.updateStatus(customer, 'appt-1', 'CANCELLED')).rejects.toMatchObject({ status: 409 });
    expect(moves).toEqual([]);
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('confirmed + accepted: the pre-payment goes to the owner, not back; both sides texted', async () => {
    const { service, moves, texts } = setup('CONFIRMED');
    await service.updateStatus(customer, 'appt-1', 'CANCELLED', undefined, true);
    await flush();
    expect(moves).toEqual([{ userId: 'owner-1', amount: 50_000, kind: 'PREPAYMENT_INCOME' }]);
    const t = texts();
    expect(t['09121234567'].text).toContain('پیش‌پرداخت ۵۰٬۰۰۰ تومان برنمی‌گردد؛ موجودی: ۱۲۰٬۰۰۰ تومان');
    expect(t['09350000000']).toMatchObject({ kind: 'prepaid-event-stylist', evenInDebt: true });
    expect(t['09350000000'].text).toContain('را لغو کرد؛ پیش‌پرداخت به سالن رسید');
  });

  it('still pending: refunded in full, no confirmation needed; both sides texted', async () => {
    const { service, moves, texts } = setup('PENDING');
    await service.updateStatus(customer, 'appt-1', 'CANCELLED');
    await flush();
    expect(moves).toEqual([{ userId: 'cust-1', amount: 50_000, kind: 'PREPAYMENT_REFUND' }]);
    const t = texts();
    expect(t['09121234567'].text).toContain('پیش‌پرداخت ۵۰٬۰۰۰ تومان به کیف پول برگشت');
    expect(t['09350000000'].text).toContain('را لغو کرد؛ پیش‌پرداخت به او برگشت');
  });
});

describe('staff confirm or cancel a prepaid booking', () => {
  it('the owner cancels: refunded; customer and stylist texted', async () => {
    const { service, moves, texts } = setup('CONFIRMED');
    await service.updateStatus(owner, 'appt-1', 'CANCELLED');
    await flush();
    expect(moves).toEqual([{ userId: 'cust-1', amount: 50_000, kind: 'PREPAYMENT_REFUND' }]);
    expect(Object.keys(texts()).sort()).toEqual(['09121234567', '09350000000']);
    expect(texts()['09350000000'].text).toContain('لغو شد؛ پیش‌پرداخت به مشتری برگشت');
  });

  it('the stylist confirms: only the customer is texted (the stylist did it)', async () => {
    const { service, texts } = setup('PENDING');
    await service.updateStatus(stylistUser, 'appt-1', 'CONFIRMED');
    await flush();
    expect(Object.keys(texts())).toEqual(['09121234567']);
    expect(texts()['09121234567'].text).toContain('تایید شد.\nپیش‌پرداخت ۵۰٬۰۰۰ تومان از کیف پول کسر شد');
  });
});
