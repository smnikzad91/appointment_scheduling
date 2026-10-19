import { SalonKind } from '@appointment-scheduling/database';
import { SalonsService } from './salons.service.js';
import { salonStatusChange, salonStatusText, smsParts, trialLength, trialStartedText } from '../sms/sms.text.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from '../sms/sms.service.js';

describe('salonStatusChange', () => {
  it('tells approval from re-activation, and rejection from suspension', () => {
    expect(salonStatusChange('PENDING', 'ACTIVE')).toBe('approved');
    expect(salonStatusChange('SUSPENDED', 'ACTIVE')).toBe('reactivated');
    expect(salonStatusChange('PENDING', 'SUSPENDED')).toBe('rejected');
    expect(salonStatusChange('ACTIVE', 'SUSPENDED')).toBe('suspended');
    expect(salonStatusChange('ACTIVE', 'ACTIVE')).toBeNull();
    expect(salonStatusChange('ACTIVE', 'PENDING')).toBeNull();
  });
});

describe('salonStatusText', () => {
  it('reads right for a salon and an independent stylist, in one segment even with a long name', () => {
    expect(salonStatusText('approved', { name: 'رز', independent: false })).toBe('سالن «رز» در نوبتت تایید شد؛ صفحه رزرو فعال است');
    expect(salonStatusText('approved', { name: 'سارا', independent: true })).toBe('صفحه رزرو شما «سارا» در نوبتت تایید و فعال شد');
    expect(salonStatusText('rejected', { name: 'رز', independent: false })).toBe('ثبت‌نام «رز» در نوبتت تایید نشد؛ با پشتیبانی تماس بگیرید');
    const long = 'سالن زیبایی و آرایشی بانوان رز سفید شعبه شمال تهران';
    for (const change of ['approved', 'rejected', 'suspended', 'reactivated'] as const) {
      expect(smsParts(salonStatusText(change, { name: long, independent: false }))).toBe(1);
    }
  });
});

describe('SalonsService.setStatus', () => {
  function setup(status: string, phone: string | null = '09121234567') {
    const salon = { id: 's1', name: 'رز', kind: SalonKind.SALON, status, owner: { phone } };
    const prisma = {
      salon: {
        findUnique: vi.fn().mockResolvedValue(salon),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...salon, ...data })),
      },
    };
    const sms = { send: vi.fn().mockResolvedValue(true) };
    return { service: new SalonsService(prisma as unknown as PrismaService, sms as unknown as SmsService), sms };
  }

  it('texts the owner when a waiting salon is approved', async () => {
    const { service, sms } = setup('PENDING');
    await service.setStatus('s1', { status: 'ACTIVE' });
    expect(sms.send).toHaveBeenCalledWith({
      kind: 'salon-status-owner',
      to: '09121234567',
      params: { change: 'approved', name: 'رز' },
      text: 'سالن «رز» در نوبتت تایید شد؛ صفحه رزرو فعال است',
    });
  });

  it('sends nothing when the status stays the same, or the owner has no phone', async () => {
    const same = setup('ACTIVE');
    await same.service.setStatus('s1', { status: 'ACTIVE' });
    expect(same.sms.send).not.toHaveBeenCalled();
    const closed = setup('PENDING', null);
    await closed.service.setStatus('s1', { status: 'SUSPENDED' });
    expect(closed.sms.send).not.toHaveBeenCalled();
  });
});

describe('free-trial SMS after approval', () => {
  const createdAt = new Date('2026-10-19T08:00:00Z');
  const trialEndsAt = new Date('2026-11-18T08:00:00Z'); // 27 Aban 1405, Tehran
  function setup(over: Record<string, unknown> = {}) {
    const salon = {
      id: 's1', name: 'رز', kind: SalonKind.SALON, status: 'PENDING', timezone: 'Asia/Tehran',
      createdAt, trialEndsAt, plan: { name: 'سالن استارتر' }, owner: { phone: '09121234567' }, ...over,
    };
    const prisma = { salon: { findUnique: vi.fn().mockResolvedValue(salon), update: vi.fn().mockResolvedValue(salon) } };
    const sms = { send: vi.fn().mockResolvedValue(true) };
    return { service: new SalonsService(prisma as unknown as PrismaService, sms as unknown as SmsService), sms };
  }
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('follows the approval text, with the plan and the end date', async () => {
    const { service, sms } = setup();
    await service.setStatus('s1', { status: 'ACTIVE' }, new Date('2026-10-20T08:00:00Z'));
    await flush();
    expect(sms.send.mock.calls.map((c) => c[0].kind)).toEqual(['salon-status-owner', 'trial-started-owner']);
    const trial = sms.send.mock.calls[1][0];
    expect(trial.text).toBe('نوبتت: یک ماه رایگان پلن «سالن استارتر» برای سالنتان فعال شد (تا ۲۷ آبان). بعد از آن برای ادامه رزرو آنلاین، پلن را از کیف پول بخرید.');
    expect(smsParts(trial.text)).toBe(2);
  });

  it('an independent stylist is addressed as «شما»', async () => {
    const { service, sms } = setup({ kind: SalonKind.INDEPENDENT, plan: { name: 'آرایشگر مستقل' } });
    await service.setStatus('s1', { status: 'ACTIVE' }, new Date('2026-10-20T08:00:00Z'));
    await flush();
    expect(sms.send.mock.calls[1][0].text).toContain('پلن «آرایشگر مستقل» برای شما فعال شد');
  });

  it('not on re-activation, a rejection, an ended trial or without a plan', async () => {
    for (const [over, status, at] of [
      [{ status: 'SUSPENDED' }, 'ACTIVE', '2026-10-20'],
      [{}, 'SUSPENDED', '2026-10-20'],
      [{}, 'ACTIVE', '2026-11-20'],
      [{ plan: null }, 'ACTIVE', '2026-10-20'],
      [{ trialEndsAt: null }, 'ACTIVE', '2026-10-20'],
    ] as const) {
      const { service, sms } = setup(over);
      await service.setStatus('s1', { status } as never, new Date(`${at}T08:00:00Z`));
      await flush();
      expect(sms.send.mock.calls.map((c) => c[0].kind)).not.toContain('trial-started-owner');
    }
  });

  it('says «۱۴ روز» for a trial that is not a month, and stays within two segments for a long plan name', () => {
    expect(trialLength(createdAt, new Date(createdAt.getTime() + 14 * 86_400_000))).toBe('۱۴ روز');
    const text = trialStartedText({ plan: 'پلن ویژه '.repeat(10), until: '۲۷ آبان', length: 'یک ماه' }, false);
    expect(smsParts(text)).toBeLessThanOrEqual(2);
  });
});
