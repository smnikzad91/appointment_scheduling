import { SalonKind } from '@appointment-scheduling/database';
import { SalonsService } from './salons.service.js';
import { salonStatusChange, salonStatusText, smsParts } from '../sms/sms.text.js';
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
