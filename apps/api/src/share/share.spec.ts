import { ConflictException, NotFoundException } from '@nestjs/common';
import { generatedStylistHandle, handleProblem, normalizeHandle } from './share-handle.util.js';
import { ShareService } from './share.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('share handles', () => {
  it('normalizes "@Rosa.Makeup " to "rosa.makeup"', () => {
    expect(normalizeHandle('  @Rosa.Makeup ')).toBe('rosa.makeup');
  });

  it('accepts clean handles and refuses bad or reserved ones', () => {
    for (const ok of ['rosa', 'rosa.makeup', 'salon_rose-2', 'a1b']) expect(handleProblem(ok)).toBeNull();
    for (const bad of ['ab', '.rosa', 'rosa.', 'ro..sa', 'رز', 'rosa makeup', 'x'.repeat(31)]) expect(handleProblem(bad)).toBe('Invalid handle');
    expect(handleProblem('admin')).toBe('This handle is reserved');
  });

  it('generates a valid stylist handle', () => {
    expect(handleProblem(generatedStylistHandle())).toBeNull();
  });
});

describe('ShareService', () => {
  function setup(opts: { salonHit?: object | null; stylistHit?: object | null; takenSalon?: object | null; takenStylist?: object | null } = {}) {
    const prisma = {
      salon: {
        findFirst: vi.fn().mockImplementation(({ where }: { where: { ownerId?: string } }) =>
          Promise.resolve(where.ownerId ? { id: 's1' } : 'status' in where ? (opts.salonHit ?? null) : (opts.takenSalon ?? null)),
        ),
        update: vi.fn().mockImplementation(({ data }: { data: { handle: string } }) => Promise.resolve({ handle: data.handle, slug: 'salon-abc12' })),
      },
      stylist: {
        findFirst: vi.fn().mockImplementation(({ where }: { where: object }) =>
          Promise.resolve('active' in where ? (opts.stylistHit ?? null) : (opts.takenStylist ?? null)),
        ),
      },
    };
    return { service: new ShareService(prisma as unknown as PrismaService), prisma };
  }

  it('resolves a salon handle (or slug) to its page', async () => {
    const { service } = setup({ salonHit: { slug: 'salon-abc12' } });
    await expect(service.resolve('@Rose')).resolves.toEqual({ slug: 'salon-abc12', stylistId: null });
  });

  it("resolves a stylist handle to their salon's page with them chosen", async () => {
    const { service } = setup({ stylistHit: { id: 'st1', salon: { slug: 'salon-abc12' } } });
    await expect(service.resolve('sara.nails')).resolves.toEqual({ slug: 'salon-abc12', stylistId: 'st1' });
  });

  it('404s for an unknown link', async () => {
    const { service } = setup();
    await expect(service.resolve('nobody')).rejects.toBeInstanceOf(NotFoundException);
  });

  it("saves a free handle, and refuses one another salon or stylist has", async () => {
    const free = setup();
    await expect(free.service.setSalonHandle('owner-1', '@Rose.Salon')).resolves.toMatchObject({ handle: 'rose.salon' });
    const takenBySalon = setup({ takenSalon: { id: 's2' } });
    await expect(takenBySalon.service.setSalonHandle('owner-1', 'rose')).rejects.toBeInstanceOf(ConflictException);
    const takenByStylist = setup({ takenStylist: { id: 'st9' } });
    await expect(takenByStylist.service.setSalonHandle('owner-1', 'rose')).rejects.toBeInstanceOf(ConflictException);
  });
});
