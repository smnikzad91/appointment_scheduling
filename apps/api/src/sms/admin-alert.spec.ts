import { adminNewAccountText, smsParts } from './sms.text.js';
import { SmsService } from './sms.service.js';
import type { ConfigService } from '@nestjs/config';
import type { ErrorLogService } from '../error-log/error-log.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('adminNewAccountText', () => {
  it('says who signed up and where, in one segment', () => {
    expect(adminNewAccountText({ who: 'salon', name: 'سالن رز', place: 'قائم‌شهر' })).toBe('سالن تازه ثبت‌نام کرد: سالن رز، قائم‌شهر؛ منتظر تایید');
    expect(adminNewAccountText({ who: 'independent', name: 'سارا ایلکا', place: 'تهران' })).toBe('آرایشگر مستقل تازه: سارا ایلکا، تهران؛ منتظر تایید');
    expect(adminNewAccountText({ who: 'stylist', name: 'مریم احمدی', place: 'سالن رز' })).toBe('آرایشگر تازه در سالن رز: مریم احمدی');
  });

  it('shortens long names rather than going past one segment', () => {
    const t = adminNewAccountText({ who: 'salon', name: 'سالن زیبایی و آرایشی بانوان رز سفید شعبه شمال تهران پاسداران', place: 'شهرستان بندر انزلی' });
    expect(smsParts(t)).toBe(1);
    expect(t).toContain('…');
  });
});

describe('SmsService.notifyAdmin', () => {
  function service(adminPhone: string | undefined) {
    const config = { get: (k: string) => (k === 'ADMIN_ALERT_PHONE' ? adminPhone : undefined) };
    const s = new SmsService(config as unknown as ConfigService, { record: vi.fn() } as unknown as ErrorLogService, {} as PrismaService);
    const send = vi.spyOn(s, 'send').mockResolvedValue(true);
    return { s, send };
  }

  it('texts ADMIN_ALERT_PHONE, with no charge', () => {
    const { s, send } = service('09119100991');
    s.notifyAdmin({ who: 'salon', name: 'رز', place: 'ساری' });
    expect(send).toHaveBeenCalledWith({
      kind: 'admin-new-account',
      to: '09119100991',
      params: { who: 'salon', name: 'رز', place: 'ساری' },
      text: 'سالن تازه ثبت‌نام کرد: رز، ساری؛ منتظر تایید',
    });
    expect(send.mock.calls[0]).toHaveLength(1);
  });

  it('sends nothing when ADMIN_ALERT_PHONE is not set, and never throws', () => {
    const { s, send } = service(undefined);
    expect(() => s.notifyAdmin({ who: 'stylist', name: 'مریم', place: 'رز' })).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
