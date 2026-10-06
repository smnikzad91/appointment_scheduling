import { NotFoundException } from '@nestjs/common';
import { RebookController } from './rebook.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function setup(found = true) {
  const prisma = {
    appointment: {
      findUnique: vi.fn().mockResolvedValue(
        found ? { customerId: 'c1', salon: { name: 'سالن رز', slug: 'salon-rose' }, customer: { promoSmsOptOut: false } } : null,
      ),
    },
    user: { update: vi.fn().mockResolvedValue({}) },
  };
  return { prisma, controller: new RebookController(prisma as unknown as PrismaService) };
}

describe('RebookController (the /r/<code> link)', () => {
  it('shows only the salon to book again at and the opt-out state', async () => {
    const { controller, prisma } = setup();
    expect(await controller.show('Ab3dE9xZ')).toEqual({ salon: { name: 'سالن رز', slug: 'salon-rose' }, optedOut: false });
    expect(prisma.appointment.findUnique.mock.calls[0][0].where).toEqual({ rebookCode: 'Ab3dE9xZ' });
  });

  it("stops (and resumes) that customer's promotional texts", async () => {
    const { controller, prisma } = setup();
    expect(await controller.setPromoSms('Ab3dE9xZ', { optOut: true })).toEqual({ optedOut: true });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { promoSmsOptOut: true } });
    await controller.setPromoSms('Ab3dE9xZ', { optOut: false });
    expect(prisma.user.update).toHaveBeenLastCalledWith({ where: { id: 'c1' }, data: { promoSmsOptOut: false } });
  });

  it('answers 404 for an unknown or malformed code, without touching anyone', async () => {
    const missing = setup(false);
    await expect(missing.controller.show('Nope1234')).rejects.toBeInstanceOf(NotFoundException);
    const bad = setup();
    await expect(bad.controller.setPromoSms('../x', { optOut: true })).rejects.toBeInstanceOf(NotFoundException);
    expect(bad.prisma.appointment.findUnique).not.toHaveBeenCalled();
    expect(bad.prisma.user.update).not.toHaveBeenCalled();
  });
});
