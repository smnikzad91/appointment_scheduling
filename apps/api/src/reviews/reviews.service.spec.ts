import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SalonsService } from '../salons/salons.service.js';

const completed = { id: 'appt-1', customerId: 'cust-1', salonId: 'salon-1', stylistId: 'sty-1', status: 'COMPLETED' };

function setup() {
  const prisma = {
    appointment: { findUnique: vi.fn().mockResolvedValue(completed) },
    review: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rev-1', ...data })),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'rev-1',
          target: 'STYLIST',
          rating: 4,
          comment: null,
          createdAt: new Date(),
          stylist: null,
          appointment: { startAt: new Date(), customer: { firstName: 'سارا', lastName: 'محمدی' }, services: [] },
          ...data,
        }),
      ),
    },
    salon: { findFirst: vi.fn().mockResolvedValue({ id: 'salon-1' }) },
    stylist: { findUnique: vi.fn() },
  };
  const service = new ReviewsService(prisma as unknown as PrismaService, {} as SalonsService);
  return { prisma, service };
}

describe('ReviewsService.create', () => {
  it('accepts a rating without a comment', async () => {
    const { service, prisma } = setup();
    await service.create('cust-1', 'appt-1', { target: 'SALON', rating: 4 });
    expect(prisma.review.create.mock.calls[0][0].data).toMatchObject({ rating: 4, comment: null, stylistId: null, salonId: 'salon-1' });
  });

  it('accepts a comment without a rating, trimmed', async () => {
    const { service, prisma } = setup();
    await service.create('cust-1', 'appt-1', { target: 'SALON', comment: '  خیلی خوب بود  ' });
    expect(prisma.review.create.mock.calls[0][0].data).toMatchObject({ rating: null, comment: 'خیلی خوب بود' });
  });

  it('rejects a review with neither a rating nor a comment (blank counts as none)', async () => {
    const { service, prisma } = setup();
    await expect(service.create('cust-1', 'appt-1', { target: 'SALON', comment: '   ' })).rejects.toThrow(BadRequestException);
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it("credits a stylist review to the appointment's stylist", async () => {
    const { service, prisma } = setup();
    await service.create('cust-1', 'appt-1', { target: 'STYLIST', rating: 5 });
    expect(prisma.review.create.mock.calls[0][0].data).toMatchObject({ target: 'STYLIST', stylistId: 'sty-1' });
  });

  it("refuses someone else's appointment and unfinished appointments", async () => {
    const { service, prisma } = setup();
    await expect(service.create('cust-2', 'appt-1', { rating: 5 })).rejects.toThrow(ForbiddenException);
    prisma.appointment.findUnique.mockResolvedValueOnce({ ...completed, status: 'CONFIRMED' });
    await expect(service.create('cust-1', 'appt-1', { rating: 5 })).rejects.toThrow(BadRequestException);
  });

  it('turns a duplicate (same appointment + target) into a 409', async () => {
    const { service, prisma } = setup();
    prisma.review.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(service.create('cust-1', 'appt-1', { rating: 5 })).rejects.toThrow(ConflictException);
  });
});

describe('ReviewsService.moderate', () => {
  function review(target: 'SALON' | 'STYLIST') {
    return { id: 'rev-1', target, salon: { ownerId: 'owner-1' }, stylist: target === 'STYLIST' ? { userId: 'sty-user-1' } : null };
  }

  it('lets the salon owner moderate any review of the salon', async () => {
    const { service, prisma } = setup();
    for (const target of ['SALON', 'STYLIST'] as const) {
      prisma.review.findUnique.mockResolvedValueOnce(review(target));
      await expect(service.moderate('owner-1', 'rev-1', { status: 'APPROVED' })).resolves.toMatchObject({ status: 'APPROVED' });
    }
  });

  it('lets a stylist moderate only reviews about them', async () => {
    const { service, prisma } = setup();
    prisma.review.findUnique.mockResolvedValueOnce(review('STYLIST'));
    await expect(service.moderate('sty-user-1', 'rev-1', { status: 'REJECTED' })).resolves.toMatchObject({ status: 'REJECTED' });

    prisma.review.findUnique.mockResolvedValueOnce(review('SALON'));
    await expect(service.moderate('sty-user-1', 'rev-1', { status: 'APPROVED' })).rejects.toThrow(ForbiddenException);

    prisma.review.findUnique.mockResolvedValueOnce(review('STYLIST'));
    await expect(service.moderate('someone-else', 'rev-1', { status: 'APPROVED' })).rejects.toThrow(ForbiddenException);
  });

  it('404s for a missing review', async () => {
    const { service, prisma } = setup();
    prisma.review.findUnique.mockResolvedValueOnce(null);
    await expect(service.moderate('owner-1', 'nope', { status: 'APPROVED' })).rejects.toThrow(NotFoundException);
  });
});

describe('ReviewsService.listForSalon', () => {
  it('returns only approved reviews and shows customers as first name + last initial', async () => {
    const { service, prisma } = setup();
    prisma.review.findMany.mockResolvedValueOnce([
      {
        id: 'rev-1',
        target: 'SALON',
        stylistId: null,
        rating: null,
        comment: 'عالی',
        createdAt: new Date(),
        appointment: { customer: { firstName: 'سارا', lastName: 'محمدی', avatarUrl: null } },
      },
    ]);
    const [r] = await service.listForSalon('rose');
    expect(prisma.review.findMany.mock.calls[0][0].where).toMatchObject({ salonId: 'salon-1', status: 'APPROVED' });
    expect(r.customer).toEqual({ firstName: 'سارا م.', avatarUrl: null });
    expect(r).not.toHaveProperty('status');
  });

  it('404s for an unknown or inactive salon', async () => {
    const { service, prisma } = setup();
    prisma.salon.findFirst.mockResolvedValueOnce(null);
    await expect(service.listForSalon('nope')).rejects.toThrow(NotFoundException);
  });
});
