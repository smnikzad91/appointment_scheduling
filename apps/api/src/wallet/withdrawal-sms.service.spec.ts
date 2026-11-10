import { WithdrawalSmsService } from './withdrawal-sms.service.js';
import { adminWithdrawalText, smsParts, withdrawalText } from '../sms/sms.text.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from '../sms/sms.service.js';

function setup(rows: object[], sendOk = true, adminAlertPhone?: string) {
  const prisma = {
    withdrawalRequest: {
      findMany: vi.fn().mockResolvedValue(rows),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const sms = { send: vi.fn().mockResolvedValue(sendOk), adminAlertPhone };
  return { service: new WithdrawalSmsService(prisma as unknown as PrismaService, sms as unknown as SmsService), prisma, sms };
}

describe('withdrawal decided SMS', () => {
  it('paid: amount and tracking code, in one segment (the code is dropped if it would not fit)', () => {
    expect(withdrawalText('withdrawal-paid', { amount: '۵۰۰٬۰۰۰', trackingCode: '140207150001' })).toBe('برداشت ۵۰۰٬۰۰۰ تومان به حسابتان واریز شد\nپیگیری: 140207150001');
    const long = withdrawalText('withdrawal-paid', { amount: '۵۰٬۰۰۰٬۰۰۰', trackingCode: 'X'.repeat(40) });
    expect(long).toBe('برداشت ۵۰٬۰۰۰٬۰۰۰ تومان به حسابتان واریز شد');
    expect(smsParts(withdrawalText('withdrawal-rejected', { amount: '۵۰٬۰۰۰٬۰۰۰', trackingCode: '' }))).toBe(1);
  });

  it('paid: the SMS quotes the amount after the fee; rejected: the whole amount (it went back to the wallet)', async () => {
    const { service, sms } = setup([
      { id: 'w1', status: 'PAID', amountToman: 500_000, feeToman: 5_000, trackingCode: '123', decidedSmsAttempts: 0, user: { phone: '0912' } },
      { id: 'w2', status: 'REJECTED', amountToman: 3_000_000, feeToman: 20_000, trackingCode: null, decidedSmsAttempts: 0, user: { phone: '0935' } },
    ]);
    await service.run();
    expect(sms.send.mock.calls.map((c) => c[0].params.amount)).toEqual(['۴۹۵٬۰۰۰', '۳٬۰۰۰٬۰۰۰']);
  });

  it('texts paid and rejected requests once', async () => {
    const { service, sms } = setup([
      { id: 'w1', status: 'PAID', amountToman: 500_000, trackingCode: '123', decidedSmsAttempts: 0, user: { phone: '0912' } },
      { id: 'w2', status: 'REJECTED', amountToman: 80_000, trackingCode: null, decidedSmsAttempts: 0, user: { phone: '0935' } },
    ]);
    expect(await service.run()).toBe(2);
    expect(sms.send.mock.calls.map((c) => c[0].kind)).toEqual(['withdrawal-paid', 'withdrawal-rejected']);
  });

  it('releases a failed send for another try', async () => {
    const { service, prisma } = setup([{ id: 'w1', status: 'PAID', amountToman: 1, trackingCode: 'x', decidedSmsAttempts: 0, user: { phone: '0912' } }], false);
    await service.run();
    expect(prisma.withdrawalRequest.update).toHaveBeenCalledWith({ where: { id: 'w1' }, data: { decidedSmsAttempts: 1, decidedSmsAt: null } });
  });
});

describe('withdrawal request SMS to the admin', () => {
  it('names the amount and who asked, in one segment (a long name is cut)', () => {
    expect(adminWithdrawalText({ amount: '۴۹۵٬۰۰۰', name: 'مریم احمدی' })).toBe('برداشت مریم احمدی: واریز ۴۹۵٬۰۰۰ تومان؛ در پنل مدیریت بررسی کنید');
    expect(smsParts(adminWithdrawalText({ amount: '۵۰٬۰۰۰٬۰۰۰', name: 'ن'.repeat(40) }))).toBe(1);
  });

  it('texts each new request to ADMIN_ALERT_PHONE once, before the decided ones', async () => {
    const { service, prisma, sms } = setup([], true, '09119100991');
    prisma.withdrawalRequest.findMany
      .mockResolvedValueOnce([{ id: 'w1', amountToman: 500_000, feeToman: 5_000, requestedSmsAttempts: 0, user: { firstName: 'مریم', lastName: 'احمدی', phone: '0912' } }])
      .mockResolvedValueOnce([]);
    expect(await service.run()).toBe(1);
    expect(prisma.withdrawalRequest.updateMany).toHaveBeenCalledWith({ where: { id: 'w1', requestedSmsAt: null }, data: { requestedSmsAt: expect.any(Date) } });
    expect(sms.send).toHaveBeenCalledWith({
      kind: 'admin-withdrawal-request',
      to: '09119100991',
      params: { amount: '۴۹۵٬۰۰۰', name: 'مریم احمدی' },
      text: 'برداشت مریم احمدی: واریز ۴۹۵٬۰۰۰ تومان؛ در پنل مدیریت بررسی کنید',
    });
  });

  it('releases a failed admin text for another try', async () => {
    const { service, prisma } = setup([], false, '09119100991');
    prisma.withdrawalRequest.findMany
      .mockResolvedValueOnce([{ id: 'w1', amountToman: 1, requestedSmsAttempts: 2, user: { firstName: '', lastName: '', phone: '0912' } }])
      .mockResolvedValueOnce([]);
    await service.run();
    expect(prisma.withdrawalRequest.update).toHaveBeenCalledWith({ where: { id: 'w1' }, data: { requestedSmsAttempts: 3 } });
  });

  it('sends nothing to the admin without ADMIN_ALERT_PHONE', async () => {
    const { service, prisma } = setup([]);
    await service.run();
    expect(prisma.withdrawalRequest.findMany).toHaveBeenCalledTimes(1);
  });
});
