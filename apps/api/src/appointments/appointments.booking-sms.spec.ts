import { AppointmentsService } from './appointments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { WaitlistService } from '../waitlist/waitlist.service.js';
import type { NotifycloudService } from '../sms/notifycloud.service.js';

const inTwoHours = () => new Date(Date.now() + 2 * 60 * 60_000);

function setup({ smsEnabled = true } = {}) {
  const tx = {
    $executeRaw: vi.fn(),
    workingHour: { findMany: vi.fn().mockResolvedValue([0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, startMinute: 0, endMinute: 1440 }))) },
    timeOff: { findFirst: vi.fn().mockResolvedValue(null) },
    appointment: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'appt-1', startAt: data.startAt, salon: { ownerId: 'owner-1' } }),
      ),
    },
  };
  const prisma = {
    salon: {
      findFirst: vi.fn().mockResolvedValue({ id: 'salon-1', timezone: 'Asia/Tehran' }),
      findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE', timezone: 'Asia/Tehran' }),
    },
    stylist: {
      findUnique: vi.fn().mockResolvedValue({ id: 'sty-1', active: true, salonId: 'salon-1', salon: { timezone: 'Asia/Tehran' } }),
      findMany: vi.fn().mockResolvedValue([{ id: 'sty-1', services: [{ serviceId: 'svc-1' }] }]),
    },
    service: { findMany: vi.fn().mockResolvedValue([{ id: 'svc-1', priceToman: 100_000, durationMinutes: 30 }]) },
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'cust-1', role: 'CUSTOMER' }) },
    appointment: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({
        id: 'appt-1',
        status: 'CONFIRMED',
        salonId: 'salon-1',
        stylistId: 'sty-1',
        customerId: 'cust-1',
        services: [],
        startAt: inTwoHours(),
        salon: { name: 'سالن رز', timezone: 'Asia/Tehran' },
        stylist: { displayName: 'مریم' },
        customer: { phone: '09121234567' },
      }),
    },
    $transaction: vi.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const notifications = { notify: vi.fn() };
  const waitlist = { notifyOpening: vi.fn() };
  const sms = { enabled: smsEnabled, sendSms: vi.fn().mockResolvedValue({ id: 'sms-1' }) };
  const service = new AppointmentsService(
    prisma as unknown as PrismaService,
    notifications as unknown as NotificationsService,
    waitlist as unknown as WaitlistService,
    sms as unknown as NotifycloudService,
  );
  return { service, prisma, sms };
}

const booking = (startAt: Date) => ({ customerPhone: '09121234567', serviceIds: ['svc-1'], startAt: startAt.toISOString() });

// The SMS is sent without awaiting it; let it finish.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('booking SMS to the customer', () => {
  it('is sent when the salon books a customer', async () => {
    const { service, sms } = setup();
    await service.createForSalon('owner-1', { ...booking(inTwoHours()), stylistId: 'sty-1' });
    await flush();

    expect(sms.sendSms).toHaveBeenCalledTimes(1);
    const [number, text, clientSmsId] = sms.sendSms.mock.calls[0];
    expect(number).toBe('09121234567');
    expect(text).toContain('سالن رز');
    expect(text).toContain('مریم');
    expect(clientSmsId).toBe('appt-1:booked');
  });

  it('is sent when a stylist books a customer with themselves', async () => {
    const { service, sms } = setup();
    await service.createForStylist('sty-user-1', booking(inTwoHours()));
    await flush();

    expect(sms.sendSms).toHaveBeenCalledTimes(1);
  });

  it('is not sent for an online booking the customer made themselves', async () => {
    const { service, sms } = setup();
    await service.create('cust-1', { salonId: 'salon-1', stylistId: 'sty-1', serviceIds: ['svc-1'], startAt: '2099-01-01T08:00:00.000Z' });
    await flush();

    expect(sms.sendSms).not.toHaveBeenCalled();
  });

  it('is not sent for a walk-in recorded after it started', async () => {
    // Midday in Tehran, so "an hour ago" is still today there.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2099-01-01T08:00:00Z') });
    try {
      const { service, sms } = setup();
      await service.createForSalon('owner-1', { ...booking(new Date(Date.now() - 60 * 60_000)), stylistId: 'sty-1' });
      await flush();

      expect(sms.sendSms).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fail the booking when the gateway fails', async () => {
    const { service, sms } = setup();
    sms.sendSms.mockRejectedValue(new Error('Insufficient API key balance.'));
    const appointment = await service.createForSalon('owner-1', { ...booking(inTwoHours()), stylistId: 'sty-1' });
    await flush();

    expect(appointment.id).toBe('appt-1');
  });

  it('is skipped without an API key', async () => {
    const { service, sms } = setup({ smsEnabled: false });
    await service.createForSalon('owner-1', { ...booking(inTwoHours()), stylistId: 'sty-1' });
    await flush();

    expect(sms.sendSms).not.toHaveBeenCalled();
  });
});

describe('cancellation SMS to the customer', () => {
  const owner = { sub: 'owner-1', role: 'SALON_OWNER' } as const;
  const stylist = { sub: 'sty-user-1', role: 'STYLIST' } as const;
  const customer = { sub: 'cust-1', role: 'CUSTOMER' } as const;

  function withOwnership() {
    const ctx = setup();
    Object.assign(ctx.prisma.salon, { findUnique: vi.fn().mockResolvedValue({ id: 'salon-1', ownerId: 'owner-1' }) });
    Object.assign(ctx.prisma.stylist, { findUnique: vi.fn().mockResolvedValue({ id: 'sty-1', userId: 'sty-user-1' }) });
    return ctx;
  }

  it('is sent when the salon cancels an upcoming booking', async () => {
    const { service, sms } = withOwnership();
    await service.updateStatus(owner, 'appt-1', 'CANCELLED');
    await flush();

    expect(sms.sendSms).toHaveBeenCalledTimes(1);
    const [, text, clientSmsId] = sms.sendSms.mock.calls[0];
    expect(text).toContain('لغو شد');
    expect(clientSmsId).toBe('appt-1:cancelled');
  });

  it('is sent when the stylist cancels', async () => {
    const { service, sms } = withOwnership();
    await service.updateStatus(stylist, 'appt-1', 'CANCELLED');
    await flush();

    expect(sms.sendSms).toHaveBeenCalledTimes(1);
  });

  it('is not sent when the customer cancels it themselves', async () => {
    const { service, sms } = withOwnership();
    await service.updateStatus(customer, 'appt-1', 'CANCELLED');
    await flush();

    expect(sms.sendSms).not.toHaveBeenCalled();
  });
});
