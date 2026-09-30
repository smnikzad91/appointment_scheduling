import { AppointmentsService } from './appointments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { WaitlistService } from '../waitlist/waitlist.service.js';
import type { SmsService } from '../sms/sms.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type { JwtPayload } from '../auth/auth.service.js';

const owner = { sub: 'owner-1', role: 'SALON_OWNER' } as JwtPayload;
const stylistUser = { sub: 'sty-user-1', role: 'STYLIST' } as JwtPayload;
const customerUser = { sub: 'cust-1', role: 'CUSTOMER' } as JwtPayload;
const inTwoHours = () => new Date(Date.now() + 2 * 60 * 60_000);

function setup({ allowance = true, kind = 'SALON' } = {}) {
  const tx = {
    $executeRaw: vi.fn(),
    workingHour: { findMany: vi.fn().mockResolvedValue([0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, startMinute: 0, endMinute: 1440 }))) },
    timeOff: { findFirst: vi.fn().mockResolvedValue(null) },
    appointment: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'appt-1', startAt: data.startAt, salon: { ownerId: 'owner-1' } })),
    },
  };
  const prisma = {
    salon: {
      findFirst: vi.fn().mockResolvedValue({ id: 'salon-1', timezone: 'Asia/Tehran' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'salon-1', ownerId: 'owner-1', status: 'ACTIVE', timezone: 'Asia/Tehran' }),
    },
    stylist: {
      findUnique: vi.fn().mockResolvedValue({ id: 'sty-1', userId: 'sty-user-1', active: true, salonId: 'salon-1', salon: { timezone: 'Asia/Tehran' } }),
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
        salon: { name: 'سالن رز', timezone: 'Asia/Tehran', kind },
        stylist: { displayName: 'مریم', user: { firstName: 'مریم', lastName: 'کاظمی' } },
        customer: { phone: '09121234567' },
      }),
    },
    $transaction: vi.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const sms = { send: vi.fn().mockResolvedValue(true) };
  const subscriptions = { takeReminderSms: vi.fn().mockResolvedValue(allowance) };
  const service = new AppointmentsService(
    prisma as unknown as PrismaService,
    { notify: vi.fn() } as unknown as NotificationsService,
    { notifyOpening: vi.fn() } as unknown as WaitlistService,
    sms as unknown as SmsService,
    subscriptions as unknown as SubscriptionsService,
  );
  return { service, sms, subscriptions };
}

const booking = (startAt: Date) => ({ customerPhone: '09121234567', stylistId: 'sty-1', serviceIds: ['svc-1'], startAt: startAt.toISOString() });
// The SMS isn't awaited by the booking; let it finish.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('SMS to the customer when staff book', () => {
  it('names only the stylist for an independent stylist', async () => {
    const { service, sms } = setup({ kind: 'INDEPENDENT' });
    await service.createForSalon(owner, booking(inTwoHours()));
    await flush();

    expect(sms.send).toHaveBeenCalledTimes(1);
    const [message] = sms.send.mock.calls[0];
    expect(message.kind).toBe('booked-customer');
    expect(message.text).toMatch(/^نوبتت: .+ ساعت .+ با مریم کاظمی ثبت شد$/);
    expect(message.text).not.toContain('سالن رز');
  });

  it.each([
    ['the owner', owner],
    ['a stylist', stylistUser],
  ])('is sent when %s books them', async (_who, user) => {
    const { service, sms } = setup();
    await service.createForSalon(user, booking(inTwoHours()));
    await flush();

    expect(sms.send).toHaveBeenCalledTimes(1);
    const [message] = sms.send.mock.calls[0];
    expect(message).toMatchObject({ kind: 'booked-customer', to: '09121234567' });
    expect(message.text).toContain('سالن رز');
    expect(message.text).toContain('مریم');
  });

  it('is not sent for a booking the customer made online', async () => {
    const { service, sms } = setup();
    await service.create('cust-1', { salonId: 'salon-1', stylistId: 'sty-1', serviceIds: ['svc-1'], startAt: '2099-01-01T08:00:00.000Z' });
    await flush();
    expect(sms.send).not.toHaveBeenCalled();
  });

  it("is not sent when the salon plan's SMS allowance is used up", async () => {
    const { service, sms } = setup({ allowance: false });
    await service.createForSalon(owner, booking(inTwoHours()));
    await flush();
    expect(sms.send).not.toHaveBeenCalled();
  });
});

describe('SMS to the customer on cancellation', () => {
  it.each([
    ['the salon', owner],
    ['the stylist', stylistUser],
  ])('is sent when %s cancels an upcoming booking', async (_who, user) => {
    const { service, sms } = setup();
    await service.updateStatus(user, 'appt-1', 'CANCELLED');
    await flush();
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(sms.send.mock.calls[0][0]).toMatchObject({ kind: 'cancelled-customer' });
  });

  it('is not sent when the customer cancels it themselves', async () => {
    const { service, sms } = setup();
    await service.updateStatus(customerUser, 'appt-1', 'CANCELLED');
    await flush();
    expect(sms.send).not.toHaveBeenCalled();
  });
});
