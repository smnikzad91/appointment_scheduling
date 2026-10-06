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
