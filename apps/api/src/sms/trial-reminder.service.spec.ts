import { TrialReminderService, daysLeftText } from './trial-reminder.service.js';
import { smsParts, trialEndingText } from './sms.text.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from './sms.service.js';
import type { ConfigService } from '@nestjs/config';

const at = (iso: string) => new Date(`${iso}+03:30`); // Tehran wall time
const NOON = at('2026-11-16T12:00:00');
const END = new Date('2026-11-19T20:29:59Z'); // 28 Aban, 23:59 Tehran

function salon(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    name: 'سالن رز',
    kind: 'SALON',
    timezone: 'Asia/Tehran',
    trialEndsAt: END,
    planExpiresAt: END,
    plan: { name: 'سالن استارتر' },
    owner: { phone: '09120000001' },
    ...over,
  };
}

function setup(rows: ReturnType<typeof salon>[], { claim = 1, sendOk = true } = {}) {
  const prisma = {
    salon: {
      findMany: vi.fn().mockResolvedValue(rows),
      updateMany: vi.fn().mockResolvedValue({ count: claim }),
    },
  };
  const sms = { send: vi.fn().mockResolvedValue(sendOk) };
  const config = { get: () => undefined } as unknown as ConfigService;
  const service = new TrialReminderService(prisma as unknown as PrismaService, sms as unknown as SmsService, config);
  service.sleep = vi.fn().mockResolvedValue(undefined);
  return { service, prisma, sms };
}

describe('TrialReminderService', () => {
  it('texts the owner once, with the days left and the end date', async () => {
    const { service, prisma, sms } = setup([salon()]);
    expect(await service.run(NOON)).toBe(1);
    expect(prisma.salon.updateMany).toHaveBeenCalledWith({ where: { id: 's1', trialReminderSentAt: null }, data: { trialReminderSentAt: NOON } });
    const msg = sms.send.mock.calls[0][0];
    expect(msg.kind).toBe('trial-ending-owner');
    expect(msg.to).toBe('09120000001');
    expect(msg.text).toContain('۴ روز دیگر (۲۸ آبان)');
    expect(msg.text).toContain('سالنتان');
    expect(sms.send.mock.calls[0][1]).toBeUndefined(); // free for the owner
  });

  it('looks only at approved salons whose trial ends within 3 days and were not texted', async () => {
    const { service, prisma } = setup([]);
    await service.run(NOON);
    const where = prisma.salon.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('ACTIVE');
    expect(where.trialReminderSentAt).toBeNull();
    expect(where.trialEndsAt).toEqual({ gt: NOON, lte: new Date(NOON.getTime() + 3 * 86_400_000) });
  });

  it('skips (but marks) a salon that already bought a plan', async () => {
    const { service, prisma, sms } = setup([salon({ planExpiresAt: new Date(END.getTime() + 30 * 86_400_000) })]);
    expect(await service.run(NOON)).toBe(0);
    expect(prisma.salon.updateMany).toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('does not send at night or when another instance claimed it', async () => {
    const night = setup([salon()]);
    expect(await night.service.run(at('2026-11-16T22:30:00'))).toBe(0);
    expect(night.prisma.salon.updateMany).not.toHaveBeenCalled();
    const lost = setup([salon()], { claim: 0 });
    expect(await lost.service.run(NOON)).toBe(0);
    expect(lost.sms.send).not.toHaveBeenCalled();
  });

  it('words it for an independent stylist and fits two SMS parts', () => {
    const text = trialEndingText({ plan: 'آرایشگر مستقل', until: '۲۸ آبان', left: '۳ روز دیگر' }, true);
    expect(text).toContain('ماه رایگان شما');
    expect(smsParts(text)).toBeLessThanOrEqual(2);
    expect(smsParts(trialEndingText({ plan: 'سالن استارتر', until: '۲۸ آبان', left: '۳ روز دیگر' }, false))).toBeLessThanOrEqual(2);
  });

  it('daysLeftText rounds up and says «فردا» for the last day', () => {
    expect(daysLeftText(END, new Date(END.getTime() - 5 * 3_600_000))).toBe('فردا');
    expect(daysLeftText(END, new Date(END.getTime() - 2.5 * 86_400_000))).toBe('۳ روز دیگر');
  });
});
