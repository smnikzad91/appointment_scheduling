import { AppointmentsService } from './appointments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from '../auth/auth.service.js';

const owner = { sub: 'owner-1', role: 'SALON_OWNER' } as JwtPayload;

function setup(current: { status: string; priceToman?: number }, commissionPercent = 40) {
  const appointment = { id: 'appt-1', salonId: 'salon-1', stylistId: 'sty-1', customerId: 'cust-1', priceToman: 350_000, ...current };
  const prisma = {
    appointment: {
      findUnique: vi.fn().mockResolvedValue(appointment),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...appointment, ...data })),
    },
    salon: { findUnique: vi.fn().mockResolvedValue({ id: 'salon-1', ownerId: 'owner-1' }) },
    stylist: { findUnique: vi.fn().mockResolvedValue({ commissionPercent }) },
  };
  return { prisma, service: new AppointmentsService(prisma as unknown as PrismaService) };
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
      completedAt: expect.any(Date),
    });
  });

  it('takes the income back out when a completed appointment is changed', async () => {
    const { service, prisma } = setup({ status: 'COMPLETED' });
    await service.updateStatus(owner, 'appt-1', 'NO_SHOW');
    expect(prisma.appointment.update.mock.calls[0][0].data).toEqual({
      status: 'NO_SHOW',
      chargedToman: null,
      stylistCommissionPercent: null,
      stylistShareToman: null,
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
