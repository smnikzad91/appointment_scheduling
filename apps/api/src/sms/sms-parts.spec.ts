import { smsParts } from './sms.text.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('smsParts', () => {
  it('counts Persian (UCS-2) as 70 chars in one part, 67 per part after that', () => {
    expect(smsParts('ا'.repeat(70))).toBe(1);
    expect(smsParts('ا'.repeat(71))).toBe(2);
    expect(smsParts('ا'.repeat(134))).toBe(2);
    expect(smsParts('ا'.repeat(135))).toBe(3);
  });

  it('counts plain Latin (GSM-7) as 160 in one part, 153 per part, escape chars as two', () => {
    expect(smsParts('a'.repeat(160))).toBe(1);
    expect(smsParts('a'.repeat(161))).toBe(2);
    expect(smsParts('{'.repeat(80))).toBe(1);
    expect(smsParts('{'.repeat(81))).toBe(2);
    expect(smsParts('code 12345 ۱')).toBe(1); // one Persian digit makes it UCS-2, still short
  });
});

describe('SubscriptionsService.takeReminderSms by parts', () => {
  function setup(limit: number | null) {
    const prisma = {
      salon: {
        findUnique: vi.fn().mockResolvedValue({ timezone: 'Asia/Tehran', planId: 'p', planExpiresAt: null, plan: { smsPerMonth: limit } }),
      },
      salonSmsUsage: { createMany: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    return { prisma, service: new SubscriptionsService(prisma as unknown as PrismaService) };
  }

  it('counts all parts at once', async () => {
    const { prisma, service } = setup(100);
    expect(await service.takeReminderSms('s1', new Date('2026-10-05T09:00:00Z'), 2)).toBe(true);
    expect(prisma.salonSmsUsage.updateMany).toHaveBeenCalledWith({
      where: { salonId: 's1', period: expect.any(String) },
      data: { sent: { increment: 2 } },
    });
  });

  it('charges one part by default, and has no ceiling without a limit', async () => {
    const { prisma, service } = setup(null);
    prisma.salon.findUnique.mockResolvedValue({ timezone: 'Asia/Tehran', planId: null, planExpiresAt: null, plan: null });
    expect(await service.takeReminderSms('s1')).toBe(true);
    expect(prisma.salonSmsUsage.updateMany.mock.calls[0][0]).toEqual({
      where: { salonId: 's1', period: expect.any(String) },
      data: { sent: { increment: 1 } },
    });
  });
});
