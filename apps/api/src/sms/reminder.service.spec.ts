import { ReminderService } from './reminder.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from './sms.service.js';
import type { ConfigService } from '@nestjs/config';

const NOW = new Date('2026-10-05T10:00:00Z'); // 13:30 in Tehran

function appt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    startAt: new Date('2026-10-05T10:55:00Z'), // 14:25 Tehran, 55 min ahead
    createdAt: new Date('2026-10-04T08:00:00Z'),
    salon: { name: 'سالن رز', timezone: 'Asia/Tehran' },
    stylist: { displayName: 'سارا', user: { phone: '09120000002' } },
    customer: { firstName: 'نگار', lastName: 'رضایی', phone: '09120000001' },
    services: [{ service: { name: 'کوتاهی مو' } }, { service: { name: 'براشینگ' } }],
    ...overrides,
  };
}

function setup(rows: ReturnType<typeof appt>[], claimCount = 1) {
  const prisma = {
    appointment: {
      findMany: vi.fn().mockResolvedValue(rows),
      updateMany: vi.fn().mockResolvedValue({ count: claimCount }),
    },
  };
  const sms = { send: vi.fn().mockResolvedValue(true) };
  const service = new ReminderService(prisma as unknown as PrismaService, sms as unknown as SmsService, { get: () => undefined } as unknown as ConfigService);
  return { service, prisma, sms };
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
});
