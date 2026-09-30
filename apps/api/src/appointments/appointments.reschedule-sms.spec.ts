import { AppointmentsService } from './appointments.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { WaitlistService } from '../waitlist/waitlist.service.js';
import type { SmsService } from '../sms/sms.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

// «نوبتت: به … منتقل شد» goes to the customer only when the date or time moves — never for a
// name, services, note or place edit.

const owner = { sub: 'owner-1', role: 'SALON_OWNER' } as JwtPayload;
const flush = () => new Promise((r) => setTimeout(r, 0));

function setup() {
  const startAt = new Date(Date.now() + 26 * 3600_000);
  const appointment = {
    id: 'appt-1',
    status: 'CONFIRMED',
    salonId: 'salon-1',
    stylistId: 'sty-1',
    customerId: 'cust-1',
    serviceLocation: null,
    visitAddress: null,
    startAt,
    endAt: new Date(startAt.getTime() + 30 * 60_000),
    services: [{ serviceId: 'svc-1', priceToman: 100_000, durationMinutes: 30 }],
    salon: { timezone: 'Asia/Tehran', kind: 'SALON', serviceLocations: [], name: 'سالن رز', ownerId: 'owner-1' },
    stylist: { displayName: 'مریم', userId: 'sty-user-1', user: { firstName: 'مریم', lastName: 'کاظمی' } },
    customer: { phone: '09121234567', firstName: 'نگار', lastName: 'x' },
  };
  const tx = {
    $executeRaw: vi.fn(),
    timeOff: { findFirst: vi.fn().mockResolvedValue(null) },
    appointment: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({ id: 'appt-1' }) },
    appointmentService: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  const prisma = {
    appointment: { findUnique: vi.fn().mockResolvedValue(appointment) },
    salon: { findUnique: vi.fn().mockResolvedValue({ id: 'salon-1', ownerId: 'owner-1' }) },
    service: { findMany: vi.fn().mockResolvedValue([{ id: 'svc-1', priceToman: 100_000, durationMinutes: 30 }, { id: 'svc-2', priceToman: 50_000, durationMinutes: 45 }]) },
    stylistService: { findMany: vi.fn().mockResolvedValue([{ serviceId: 'svc-1' }, { serviceId: 'svc-2' }]) },
    $transaction: vi.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const sms = { send: vi.fn().mockResolvedValue(true) };
  const service = new AppointmentsService(
    prisma as unknown as PrismaService,
    { notify: vi.fn() } as unknown as NotificationsService,
    { notifyOpening: vi.fn() } as unknown as WaitlistService,
    sms as unknown as SmsService,
    { takeReminderSms: vi.fn().mockResolvedValue(true) } as unknown as SubscriptionsService,
  );
  return { service, sms, startAt };
}

describe('«منتقل شد» SMS to the customer', () => {
  it('is sent when the time moves', async () => {
    const { service, sms, startAt } = setup();
    await service.updateDetails(owner, 'appt-1', { startAt: new Date(startAt.getTime() + 3600_000).toISOString() });
    await flush();
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(sms.send.mock.calls[0][0]).toMatchObject({ kind: 'rescheduled-customer', to: '09121234567' });
  });

  it('is sent when the date moves', async () => {
    const { service, sms, startAt } = setup();
    await service.updateDetails(owner, 'appt-1', { startAt: new Date(startAt.getTime() + 2 * 86_400_000).toISOString() });
    await flush();
    expect(sms.send.mock.calls.map((c) => c[0].kind)).toEqual(['rescheduled-customer']);
  });

  it.each([
    ['the customer name', { customerFirstName: 'سارا', customerLastName: 'احمدی' }],
    ['the services (the end time moves, the start does not)', { serviceIds: ['svc-1', 'svc-2'] }],
    ['the note', { notes: 'رنگ روشن‌تر' }],
  ])('is not sent for a change of %s', async (_what, dto) => {
    const { service, sms } = setup();
    await service.updateDetails(owner, 'appt-1', dto);
    await flush();
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('is not sent when the same time is sent again', async () => {
    const { service, sms, startAt } = setup();
    await service.updateDetails(owner, 'appt-1', { startAt: startAt.toISOString(), notes: 'x' });
    await flush();
    expect(sms.send).not.toHaveBeenCalled();
  });
});
