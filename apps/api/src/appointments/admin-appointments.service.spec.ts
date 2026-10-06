import { AdminAppointmentsService } from './admin-appointments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const row = {
  id: 'a1', status: 'CONFIRMED', startAt: new Date(), endAt: new Date(), createdAt: new Date(), priceToman: 400_000,
  chargedToman: null, tipToman: null, stylistShareToman: null, prepaidToman: 200_000, prepaymentStatus: 'HELD', prepaymentStylistToman: 0,
  notes: null, serviceLocation: null, visitAddress: null, customerFirstName: 'نام رزرو', customerLastName: null,
  salon: { id: 's1', name: 'سالن رز' }, stylist: { id: 'st1', displayName: 'مریم' },
  customer: { id: 'c1', firstName: 'سارا', lastName: 'احمدی', phone: '09121234567' },
  services: [{ priceToman: 400_000, durationMinutes: 60, service: { name: 'کوتاهی' } }], reviews: [],
};

function setup() {
  const prisma = {
    appointment: {
      findMany: vi.fn().mockResolvedValue([row]),
      count: vi.fn().mockResolvedValue(1),
      groupBy: vi.fn().mockResolvedValue([{ status: 'CONFIRMED', _count: { _all: 1 } }, { status: 'CANCELLED', _count: { _all: 3 } }]),
    },
  };
  return { service: new AdminAppointmentsService(prisma as unknown as PrismaService), prisma };
}

describe('admin appointments list', () => {
  it('shows the booking\'s own customer name, services and per-status counts', async () => {
    const { service } = setup();
    const res = await service.list({});
    expect(res.counts).toEqual({ CONFIRMED: 1, CANCELLED: 3 });
    expect(res.items[0].customer).toMatchObject({ firstName: 'نام رزرو', lastName: 'احمدی', phone: '09121234567' });
    expect(res.items[0].services).toEqual([{ name: 'کوتاهی', priceToman: 400_000, durationMinutes: 60 }]);
    expect(res.items[0]).not.toHaveProperty('customer.passwordHash');
  });

  it('filters by status for the list but counts every status; search words with Persian digits and +98', async () => {
    const { service, prisma } = setup();
    await service.list({ status: 'CANCELLED', q: 'سارا +98۹۱۲', page: 2 });
    const listArgs = prisma.appointment.findMany.mock.calls[0][0];
    expect(listArgs.where.status).toBe('CANCELLED');
    expect(listArgs.skip).toBe(50);
    expect(listArgs.where.AND).toHaveLength(2);
    expect(JSON.stringify(listArgs.where.AND[1])).toContain('"phone":{"contains":"0912"}');
    expect(prisma.appointment.groupBy.mock.calls[0][0].where.status).toBeUndefined();
  });
});
