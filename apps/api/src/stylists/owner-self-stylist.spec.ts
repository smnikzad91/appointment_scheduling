import { Role, SalonKind } from '@appointment-scheduling/database';
import { StylistsService } from './stylists.service.js';
import { roleSatisfies } from '../auth/guards/roles.guard.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type { SalonsService } from '../salons/salons.service.js';

// A salon owner who also works as a stylist in their own salon (StylistsService.addSelf).

function setup(opts: { kind?: SalonKind; existing?: { id: string; userId: string; salonId: string; active: boolean } | null } = {}) {
  const salon = { id: 's1', ownerId: 'owner', kind: opts.kind ?? SalonKind.SALON, name: 'سالن رز' };
  const prisma = {
    stylist: {
      findUnique: vi.fn().mockResolvedValue(opts.existing ?? null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new', ...data })),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...opts.existing, ...data })),
    },
    salon: { findUnique: vi.fn().mockResolvedValue(salon) },
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ firstName: 'مریم', lastName: 'احمدی', avatarUrl: '/uploads/stylists/a.jpg' }), update: vi.fn() },
    service: { findMany: vi.fn().mockResolvedValue([{ id: 'svc1' }, { id: 'svc2' }]) },
    $transaction: vi.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const salons = { findMine: vi.fn().mockResolvedValue(salon) };
  const subscriptions = { assertCanAddStylist: vi.fn() };
  const service = new StylistsService(prisma as unknown as PrismaService, salons as unknown as SalonsService, subscriptions as unknown as SubscriptionsService);
  return { service, prisma, subscriptions };
}

describe('StylistsService.addSelf', () => {
  it("creates the owner's own stylist profile: 0% commission, every active service, a plan seat", async () => {
    const { service, prisma, subscriptions } = setup();
    await service.addSelf('owner');
    expect(subscriptions.assertCanAddStylist).toHaveBeenCalledWith('s1');
    expect(prisma.service.findMany).toHaveBeenCalledWith({ where: { salonId: 's1', active: true }, select: { id: true } });
    expect(prisma.stylist.create).toHaveBeenCalledWith({
      data: {
        userId: 'owner',
        salonId: 's1',
        displayName: 'مریم احمدی',
        avatarUrl: '/uploads/stylists/a.jpg',
        commissionPercent: 0,
        services: { create: [{ serviceId: 'svc1' }, { serviceId: 'svc2' }] },
      },
    });
  });

  it('switches a switched-off profile back on (taking a seat), and leaves an active one as it is', async () => {
    const off = setup({ existing: { id: 'st1', userId: 'owner', salonId: 's1', active: false } });
    await off.service.addSelf('owner');
    expect(off.subscriptions.assertCanAddStylist).toHaveBeenCalled();
    expect(off.prisma.stylist.update).toHaveBeenCalledWith({ where: { id: 'st1' }, data: { active: true } });
    expect(off.prisma.stylist.create).not.toHaveBeenCalled();

    const on = setup({ existing: { id: 'st1', userId: 'owner', salonId: 's1', active: true } });
    await expect(on.service.addSelf('owner')).resolves.toMatchObject({ id: 'st1', active: true });
    expect(on.subscriptions.assertCanAddStylist).not.toHaveBeenCalled();
    expect(on.prisma.stylist.update).not.toHaveBeenCalled();
  });

  it('is refused for an independent stylist (already their own stylist)', async () => {
    const { service, prisma } = setup({ kind: SalonKind.INDEPENDENT });
    await expect(service.addSelf('owner')).rejects.toThrow(/works alone/);
    expect(prisma.stylist.create).not.toHaveBeenCalled();
  });
});

describe("the owner's own stylist profile", () => {
  it('a salon owner may switch it off; an independent stylist may not; neither gets a commission', async () => {
    const own = { id: 'st1', userId: 'owner', salonId: 's1', active: true };
    const salonOwner = setup({ existing: own });
    await salonOwner.service.update('owner', 'st1', { active: false });
    expect(salonOwner.prisma.stylist.update).toHaveBeenCalledWith({ where: { id: 'st1' }, data: { active: false } });
    await expect(salonOwner.service.update('owner', 'st1', { commissionPercent: 30 })).rejects.toThrow(/commission/);

    const independent = setup({ kind: SalonKind.INDEPENDENT, existing: own });
    await expect(independent.service.update('owner', 'st1', { active: false })).rejects.toThrow(/deactivated/);
  });

  it("an owner can reach the stylist 'me' routes only through the controller's explicit role (not roleSatisfies)", () => {
    expect(roleSatisfies(Role.SALON_OWNER, Role.STYLIST)).toBe(false);
  });
});
