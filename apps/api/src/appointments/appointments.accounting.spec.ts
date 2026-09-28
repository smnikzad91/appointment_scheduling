import { AppointmentsService } from './appointments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { WaitlistService } from '../waitlist/waitlist.service.js';
import type { NotifycloudService } from '../sms/notifycloud.service.js';
import type { JwtPayload } from '../auth/auth.service.js';

const owner = { sub: 'owner-1', role: 'SALON_OWNER' } as JwtPayload;

function setup(
  current: { status: string; priceToman?: number },
  commissionPercent = 40,
  ownRates: { serviceId: string; commissionPercent: number | null }[] = [],
) {
  const appointment = {
    id: 'appt-1',
    salonId: 'salon-1',
    stylistId: 'sty-1',
    customerId: 'cust-1',
    priceToman: 350_000,
    services: [
      { serviceId: 'svc-cut', priceToman: 250_000 },
      { serviceId: 'svc-wash', priceToman: 100_000 },
    ],
    ...current,
  };
  const prisma = {
    appointment: {
      findUnique: vi.fn().mockResolvedValue(appointment),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...appointment, ...data })),
    },
    salon: { findUnique: vi.fn().mockResolvedValue({ id: 'salon-1', ownerId: 'owner-1' }) },
    stylist: { findUnique: vi.fn().mockResolvedValue({ commissionPercent, services: ownRates }) },
  };
  const notifications = { notify: vi.fn() };
  const waitlist = { notifyOpening: vi.fn() };
  return {
    appointment,
    prisma,
    notifications,
    service: new AppointmentsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      waitlist as unknown as WaitlistService,
      { enabled: false } as unknown as NotifycloudService,
    ),
  };
}

describe('AppointmentsService accounting on status change', () => {
  it("books the income with the stylist's current commission when completed", async () => {
    const { service, prisma } = setup({ status: 'CONFIRMED' }, 40);
    await service.updateStatus(owner, 'appt-1', 'COMPLETED');
    expect(prisma.appointment.update.mock.calls[0][0].data).toMatchObject({
      status: 'COMPLETED',
      chargedToman: 350_000,
      stylistCommissionPercent: 40,
      stylistShareToman: 140_000,
      tipToman: null,
      completedAt: expect.any(Date),
    });
  });

  it("weights a service's own rate by its price", async () => {
    // cut 250k at the default 40% + wash 100k at 60% = 160k of 350k
    const { service, prisma } = setup({ status: 'CONFIRMED' }, 40, [
      { serviceId: 'svc-cut', commissionPercent: null },
      { serviceId: 'svc-wash', commissionPercent: 60 },
    ]);
    await service.updateStatus(owner, 'appt-1', 'COMPLETED');
    const data = prisma.appointment.update.mock.calls[0][0].data;
    expect(data.stylistShareToman).toBe(160_000);
    expect(data.stylistCommissionPercent).toBeCloseTo(45.714, 3);
  });

  it('takes the income back out when a completed appointment is changed', async () => {
    const { service, prisma } = setup({ status: 'COMPLETED' });
    await service.updateStatus(owner, 'appt-1', 'NO_SHOW');
    expect(prisma.appointment.update.mock.calls[0][0].data).toEqual({
      status: 'NO_SHOW',
      chargedToman: null,
      stylistCommissionPercent: null,
      stylistShareToman: null,
      tipToman: null,
      completedAt: null,
    });
  });

  it('leaves the books alone for other transitions (and re-completing a completed one)', async () => {
    const { service, prisma } = setup({ status: 'PENDING' });
    await service.updateStatus(owner, 'appt-1', 'CONFIRMED');
    expect(prisma.appointment.update.mock.calls[0][0].data).toEqual({ status: 'CONFIRMED' });

    const again = setup({ status: 'COMPLETED' });
    await again.service.updateStatus(owner, 'appt-1', 'COMPLETED');
    expect(again.prisma.appointment.update.mock.calls[0][0].data).toEqual({ status: 'COMPLETED' });
    expect(again.prisma.stylist.findUnique).not.toHaveBeenCalled();
  });
});

describe('AppointmentsService cancellation notice', () => {
  it('tells the owner, the stylist and the customer, except whoever cancelled', async () => {
    const { service, prisma, notifications, appointment } = setup({ status: 'CONFIRMED' });
    prisma.appointment.findUnique.mockResolvedValueOnce(appointment).mockResolvedValueOnce({
      startAt: new Date('2026-10-01T08:00:00Z'),
      customerId: 'cust-1',
      salon: { ownerId: 'owner-1', name: 'رز' },
      stylist: { userId: 'sty-user-1', displayName: 'نگار' },
      customer: { firstName: 'مریم', lastName: 'احمدی' },
      services: [{ service: { name: 'کوتاهی' } }],
    });
    await service.updateStatus(owner, 'appt-1', 'CANCELLED');
    expect(notifications.notify).toHaveBeenCalledWith(
      ['owner-1', 'sty-user-1', 'cust-1'],
      'BOOKING_CANCELLED',
      expect.objectContaining({ appointmentId: 'appt-1', salonName: 'رز', customerName: 'مریم احمدی', cancelledBy: 'SALON', services: ['کوتاهی'] }),
      'owner-1',
    );
  });
});

describe('AppointmentsService confirmation notice', () => {
  it('tells only the customer when a pending booking is confirmed', async () => {
    const { service, prisma, notifications, appointment } = setup({ status: 'PENDING' });
    prisma.appointment.findUnique.mockResolvedValueOnce(appointment).mockResolvedValueOnce({
      startAt: new Date('2026-10-01T08:00:00Z'),
      customerId: 'cust-1',
      salon: { ownerId: 'owner-1', name: 'رز' },
      stylist: { userId: 'sty-user-1', displayName: 'نگار' },
      customer: { firstName: 'مریم', lastName: 'احمدی' },
      services: [],
    });
    await service.updateStatus(owner, 'appt-1', 'CONFIRMED');
    expect(notifications.notify).toHaveBeenCalledWith(['cust-1'], 'BOOKING_CONFIRMED', expect.objectContaining({ salonName: 'رز' }), 'owner-1');
  });

  it('says nothing when an already confirmed booking is saved again', async () => {
    const { service, notifications } = setup({ status: 'CONFIRMED' });
    await service.updateStatus(owner, 'appt-1', 'CONFIRMED');
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
