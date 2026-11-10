import { ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const NOW = new Date('2026-09-28T12:00:00Z'); // Mehr 1405 in Tehran

function setup(salon: Record<string, unknown> | null, extra: { activeStylists?: number; updated?: number } = {}) {
  const prisma = {
    salon: { findUnique: vi.fn().mockResolvedValue(salon) },
    stylist: { count: vi.fn().mockResolvedValue(extra.activeStylists ?? 0) },
    salonSmsUsage: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: extra.updated ?? 1 }),
    },
  };
  return { service: new SubscriptionsService(prisma as unknown as PrismaService), prisma };
}

describe('SubscriptionsService.assertCanAddStylist', () => {
  it('lets salons without a plan add stylists freely', async () => {
    const { service, prisma } = setup({ planId: null, planExpiresAt: null, plan: null });
    await expect(service.assertCanAddStylist('s1')).resolves.toBeUndefined();
    expect(prisma.stylist.count).not.toHaveBeenCalled();
  });

  it('refuses once the active stylists fill the plan', async () => {
    const { service } = setup({ planId: 'p', planExpiresAt: null, plan: { maxStylists: 2 } }, { activeStylists: 2 });
    await expect(service.assertCanAddStylist('s1')).rejects.toThrow("Your plan's stylist limit is reached");
  });

  it('allows up to the limit, and any number on an unlimited plan', async () => {
    await expect(setup({ planId: 'p', planExpiresAt: null, plan: { maxStylists: 2 } }, { activeStylists: 1 }).service.assertCanAddStylist('s1')).resolves.toBeUndefined();
    await expect(setup({ planId: 'p', planExpiresAt: null, plan: { maxStylists: null } }, { activeStylists: 99 }).service.assertCanAddStylist('s1')).resolves.toBeUndefined();
  });

  it('refuses when the subscription has expired', async () => {
    const { service } = setup({ planId: 'p', planExpiresAt: new Date('2020-01-01'), plan: { maxStylists: null } });
    await expect(service.assertCanAddStylist('s1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('SubscriptionsService.takeReminderSms', () => {
  const salon = (plan: { smsPerMonth: number | null } | null, planExpiresAt: Date | null = null) => ({
    timezone: 'Asia/Tehran',
    planId: plan ? 'p' : null,
    planExpiresAt,
    plan,
  });

  it("counts usage for this Jalali month and never says no (the allowance no longer limits; SMS cost the stylist)", async () => {
    for (const plan of [{ smsPerMonth: 100 }, { smsPerMonth: 0 }, { smsPerMonth: null }]) {
      const { service, prisma } = setup(salon(plan), { updated: 0 });
      expect(await service.takeReminderSms('s1', NOW)).toBe(true);
      expect(prisma.salonSmsUsage.createMany).toHaveBeenCalledWith({ data: [{ salonId: 's1', period: '1405-07' }], skipDuplicates: true });
      expect(prisma.salonSmsUsage.updateMany).toHaveBeenCalledWith({ where: { salonId: 's1', period: '1405-07' }, data: { sent: { increment: 1 } } });
    }
    const expired = setup(salon({ smsPerMonth: 100 }, new Date('2026-09-01')));
    expect(await expired.service.takeReminderSms('s1', NOW)).toBe(true);
  });

  it('only records usage for salons without a plan', async () => {
    const { service, prisma } = setup(salon(null));
    expect(await service.takeReminderSms('s1', NOW)).toBe(true);
    expect(prisma.salonSmsUsage.updateMany.mock.calls[0][0].where).toEqual({ salonId: 's1', period: '1405-07' });
  });
});

describe('SubscriptionsService.initialFor (sign-up plan + free trial)', () => {
  function signup(plan: { id: string } | null, trialDays = 30) {
    const prisma = {
      pricingPlan: { findFirst: vi.fn().mockResolvedValue(plan) },
      pricingSettings: { findUnique: vi.fn().mockResolvedValue({ trialDays }) },
    };
    return { service: new SubscriptionsService(prisma as unknown as PrismaService), prisma };
  }

  it('an independent stylist only gets an INDEPENDENT plan, a salon only a SALON one', async () => {
    const solo = signup({ id: 'plan_solo' });
    await solo.service.initialFor(undefined, 'INDEPENDENT');
    expect(solo.prisma.pricingPlan.findFirst.mock.calls[0][0].where).toEqual({ active: true, audience: 'INDEPENDENT' });
    const salon = signup({ id: 'plan_growth' });
    await salon.service.initialFor('plan_growth', 'SALON');
    expect(salon.prisma.pricingPlan.findFirst.mock.calls[0][0].where).toEqual({ active: true, audience: 'SALON', id: 'plan_growth' });
  });

  it('a picked plan of the other kind is refused', async () => {
    await expect(signup(null).service.initialFor('plan_solo', 'SALON')).rejects.toThrow('This plan is no longer available');
  });

  it('the trial ends the plan and is remembered as trialEndsAt', async () => {
    const before = Date.now();
    const result = await signup({ id: 'plan_solo' }, 30).service.initialFor(undefined, 'INDEPENDENT');
    expect(result.planId).toBe('plan_solo');
    expect(result.trialEndsAt).toEqual(result.planExpiresAt);
    expect(result.trialEndsAt!.getTime() - before).toBeGreaterThanOrEqual(30 * 86_400_000 - 1000);
    expect(await signup({ id: 'p' }, 0).service.initialFor(undefined)).toEqual({ planId: 'p', planExpiresAt: null, trialEndsAt: null });
  });
});

describe('SubscriptionsService.purchase during the free trial', () => {
  it('the paid month starts when the trial ends, even on another plan', async () => {
    const trialEndsAt = new Date(NOW.getTime() + 10 * 86_400_000);
    const tx = {
      salon: {
        findFirst: vi.fn().mockResolvedValue({ id: 's1' }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 's1', ownerId: 'o1', kind: 'SALON', planId: 'plan_starter', planExpiresAt: trialEndsAt, trialEndsAt }),
        update: vi.fn(),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ walletBalance: 1_000_000 }]),
      pricingPlan: { findFirst: vi.fn().mockResolvedValue({ id: 'plan_growth', name: 'سالن رشد', monthlyPriceToman: 1_499_000 }) },
      planPurchase: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 'pp1' }), update: vi.fn() },
      walletTransaction: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
    const service = new SubscriptionsService(prisma as unknown as PrismaService);
    const result = await service.purchase('o1', { planId: 'plan_growth', months: 1 }, NOW);
    expect(result.startsAt).toEqual(trialEndsAt);
    expect(result.expiresAt).toEqual(new Date(trialEndsAt.getTime() + 30 * 86_400_000));
    expect(tx.pricingPlan.findFirst.mock.calls[0][0].where).toMatchObject({ audience: 'SALON' });
  });
});
