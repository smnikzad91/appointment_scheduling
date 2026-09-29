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
    customerReminderSentAt: null as Date | null,
    customerReminderAttempts: 0,
    stylistReminderSentAt: null as Date | null,
    stylistReminderAttempts: 0,
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
      update: vi.fn().mockResolvedValue({}),
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

/** The data of every appointment.update call for booking `id`, merged in call order. */
const updates = (prisma: ReturnType<typeof setup>['prisma'], id = 'a1') =>
  prisma.appointment.update.mock.calls.filter((c) => c[0].where.id === id).map((c) => c[0].data);

describe('ReminderService.tick', () => {
  it('texts both the customer and the stylist, in salon-local time, then marks the booking done', async () => {
    const { service, sms, prisma } = setup([appt()]);
    expect(await service.tick(NOW)).toBe(2);

    const [customer, stylist] = sms.send.mock.calls.map((c) => c[0]);
    expect(customer).toMatchObject({ kind: 'reminder-customer', to: '09120000001', params: { time: '۱۴:۲۵', salon: 'سالن رز', stylist: 'سارا' } });
    expect(customer.text).toContain('۱۴:۲۵');
    expect(stylist).toMatchObject({ kind: 'reminder-stylist', to: '09120000002', params: { customer: 'نگار رضایی', services: 'کوتاهی مو، براشینگ' } });

    const data = updates(prisma);
    expect(data).toContainEqual({ customerReminderSentAt: NOW });
    expect(data).toContainEqual({ stylistReminderSentAt: NOW });
    expect(data.at(-1)).toEqual({ reminderLeaseUntil: null, reminderSentAt: NOW });
  });

  it('also picks up a missed window: anything unreminded starting 15–60 minutes from now', async () => {
    const { service, prisma } = setup([appt({ startAt: new Date('2026-10-05T10:20:00Z') })]); // 20 min ahead
    expect(await service.tick(NOW)).toBe(2);
    const where = prisma.appointment.findMany.mock.calls[0][0].where;
    expect(where.reminderSentAt).toBeNull();
    expect(where.startAt).toEqual({ gt: new Date('2026-10-05T10:15:00Z'), lte: new Date('2026-10-05T11:00:00Z') });
  });

  it('takes a lease before sending and sends nothing when another instance holds it', async () => {
    const { service, sms, prisma } = setup([appt()], 0);
    expect(await service.tick(NOW)).toBe(0);
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: 'a1', reminderSentAt: null, OR: [{ reminderLeaseUntil: null }, { reminderLeaseUntil: { lt: NOW } }] },
      data: { reminderLeaseUntil: new Date('2026-10-05T10:02:00Z') },
    });
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('skips bookings made less than an hour before they start', async () => {
    const { service, sms, prisma } = setup([appt({ createdAt: new Date('2026-10-05T09:58:00Z') })]);
    expect(await service.tick(NOW)).toBe(0);
    expect(sms.send).not.toHaveBeenCalled();
    expect(updates(prisma)).toEqual([{ reminderSentAt: NOW, reminderLeaseUntil: null }]);
  });

  it('skips a missing phone number without failing the other message', async () => {
    const { service, sms } = setup([appt({ stylist: { displayName: 'سارا', user: { phone: null } } })]);
    expect(await service.tick(NOW)).toBe(1);
    expect(sms.send).toHaveBeenCalledTimes(1);
  });

  it("stops at the salon plan's monthly allowance, customer first, and gives the other up", async () => {
    const { service, sms, subscriptions, prisma } = setup([appt()], 1, 1);
    expect(await service.tick(NOW)).toBe(1);
    expect(subscriptions.takeReminderSms).toHaveBeenCalledWith('s1', NOW);
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(sms.send.mock.calls[0][0].kind).toBe('reminder-customer');
    expect(updates(prisma)).toContainEqual({ stylistReminderAttempts: 3 });
    expect(updates(prisma).at(-1)).toMatchObject({ reminderSentAt: NOW });
  });

  it('keeps a failed send open for a retry, without marking the booking done', async () => {
    const { service, sms, prisma } = setup([appt()]);
    sms.send.mockImplementation(async (m: { kind: string }) => m.kind === 'reminder-customer'); // stylist's fails
    expect(await service.tick(NOW)).toBe(1);
    const data = updates(prisma);
    expect(data).toContainEqual({ stylistReminderAttempts: { increment: 1 } });
    expect(data).not.toContainEqual({ stylistReminderSentAt: NOW });
    expect(data.at(-1)).toEqual({ reminderLeaseUntil: null }); // lease freed, reminderSentAt still null
  });

  it('retries only the recipient that failed, without charging the allowance again', async () => {
    const retry = appt({ customerReminderSentAt: new Date('2026-10-05T09:59:00Z'), customerReminderAttempts: 1, stylistReminderAttempts: 1 });
    const { service, sms, subscriptions, prisma } = setup([retry]);
    expect(await service.tick(NOW)).toBe(1);
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(sms.send.mock.calls[0][0].kind).toBe('reminder-stylist');
    expect(subscriptions.takeReminderSms).not.toHaveBeenCalled();
    expect(updates(prisma).at(-1)).toEqual({ reminderLeaseUntil: null, reminderSentAt: NOW });
  });

  it('gives up after the third failed try and marks the booking done', async () => {
    const { service, sms, prisma } = setup([appt({ customerReminderSentAt: NOW, stylistReminderAttempts: 2 })]);
    sms.send.mockResolvedValue(false);
    expect(await service.tick(NOW)).toBe(0);
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(updates(prisma).at(-1)).toEqual({ reminderLeaseUntil: null, reminderSentAt: NOW });
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
