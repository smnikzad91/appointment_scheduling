import { ReminderService } from './reminder.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from './sms.service.js';
import type { ConfigService } from '@nestjs/config';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

const NOW = new Date('2026-10-05T10:00:00Z'); // 13:30 in Tehran

function appt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    salonId: 's1',
    startAt: new Date('2026-10-05T10:55:00Z'), // 14:25 Tehran, 55 min ahead
    createdAt: new Date('2026-10-04T08:00:00Z'),
    salon: { name: 'سالن رز', timezone: 'Asia/Tehran' },
    stylist: { displayName: 'سارا', user: { phone: '09120000002' } },
    customer: { firstName: 'نگار', lastName: 'رضایی', phone: '09120000001' },
    services: [{ service: { name: 'کوتاهی مو' } }, { service: { name: 'براشینگ' } }],
    ...overrides,
  };
}

function setup(rows: ReturnType<typeof appt>[], claimCount = 1, allowance = Infinity, nudgeRows: ReturnType<typeof appt>[] = []) {
  const prisma = {
    appointment: {
      // first query: 1-hour reminders; second: unconfirmed online bookings to nudge
      findMany: vi.fn().mockResolvedValueOnce(rows).mockResolvedValue(nudgeRows),
      updateMany: vi.fn().mockResolvedValue({ count: claimCount }),
    },
  };
  const sms = { send: vi.fn().mockResolvedValue(true) };
  let left = allowance;
  const subscriptions = { takeReminderSms: vi.fn(async () => left-- > 0) };
  const service = new ReminderService(
    prisma as unknown as PrismaService,
    sms as unknown as SmsService,
    { get: () => undefined } as unknown as ConfigService,
    subscriptions as unknown as SubscriptionsService,
  );
  return { service, prisma, sms, subscriptions };
}

describe('ReminderService.tick', () => {
  it('texts both the customer and the stylist, in salon-local time', async () => {
    const { service, sms, prisma } = setup([appt()]);
    expect(await service.tick(NOW)).toBe(2);

    const where = prisma.appointment.findMany.mock.calls[0][0].where;
    expect(where.reminderSentAt).toBeNull();
    expect(where.startAt).toEqual({ gt: new Date('2026-10-05T10:50:00Z'), lte: new Date('2026-10-05T11:00:00Z') });

    const [customer, stylist] = sms.send.mock.calls.map((c) => c[0]);
    expect(customer).toMatchObject({ kind: 'reminder-customer', to: '09120000001', params: { time: '۱۴:۲۵', salon: 'سالن رز', stylist: 'سارا' } });
    expect(customer.text).toContain('۱۴:۲۵');
    expect(stylist).toMatchObject({ kind: 'reminder-stylist', to: '09120000002', params: { customer: 'نگار رضایی', services: 'کوتاهی مو، براشینگ' } });
  });

  it('claims before sending and sends nothing when another instance already claimed it', async () => {
    const { service, sms, prisma } = setup([appt()], 0);
    expect(await service.tick(NOW)).toBe(0);
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({ where: { id: 'a1', reminderSentAt: null }, data: { reminderSentAt: NOW } });
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('skips bookings made less than an hour before they start', async () => {
    const { service, sms } = setup([appt({ createdAt: new Date('2026-10-05T09:58:00Z') })]);
    expect(await service.tick(NOW)).toBe(0);
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('skips a missing phone number without failing the other message', async () => {
    const { service, sms } = setup([appt({ stylist: { displayName: 'سارا', user: { phone: null } } })]);
    expect(await service.tick(NOW)).toBe(1);
    expect(sms.send).toHaveBeenCalledTimes(1);
  });

  it("stops at the salon plan's monthly allowance, customer first", async () => {
    const { service, sms, subscriptions } = setup([appt()], 1, 1);
    expect(await service.tick(NOW)).toBe(1);
    expect(subscriptions.takeReminderSms).toHaveBeenCalledWith('s1', NOW);
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(sms.send.mock.calls[0][0].kind).toBe('reminder-customer');
  });
});

describe('ReminderService unconfirmed-booking nudge', () => {
  const pending = () => appt({ id: 'p1', createdAt: new Date('2026-10-05T07:00:00Z'), startAt: new Date('2026-10-06T08:00:00Z') });

  it('texts the stylist once about an online booking still pending 2 hours later', async () => {
    const { service, sms, prisma } = setup([], 1, Infinity, [pending()]);
    expect(await service.tick(NOW)).toBe(1);

    const where = prisma.appointment.findMany.mock.calls[1][0].where;
    expect(where).toMatchObject({ status: 'PENDING', confirmNudgedAt: null, startAt: { gt: NOW } });
    expect(where.createdAt).toEqual({ lte: new Date('2026-10-05T08:00:00Z') });
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({ where: { id: 'p1', confirmNudgedAt: null }, data: { confirmNudgedAt: NOW } });

    const msg = sms.send.mock.calls[0][0];
    expect(msg).toMatchObject({ kind: 'confirm-nudge-stylist', to: '09120000002', params: { customer: 'نگار رضایی' } });
    expect(msg.text).toContain('هنوز تایید نشده');
    expect(msg.text.length).toBeLessThanOrEqual(70);
  });

  it('sends nothing when another instance claimed it or the SMS allowance is used up', async () => {
    const claimed = setup([], 0, Infinity, [pending()]);
    expect(await claimed.service.tick(NOW)).toBe(0);
    const noAllowance = setup([], 1, 0, [pending()]);
    expect(await noAllowance.service.tick(NOW)).toBe(0);
    expect(noAllowance.sms.send).not.toHaveBeenCalled();
  });
});
