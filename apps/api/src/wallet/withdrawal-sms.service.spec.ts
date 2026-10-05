import { WithdrawalSmsService } from './withdrawal-sms.service.js';
import { smsParts, withdrawalText } from '../sms/sms.text.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from '../sms/sms.service.js';

function setup(rows: object[], sendOk = true) {
  const prisma = {
    withdrawalRequest: {
      findMany: vi.fn().mockResolvedValue(rows),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const sms = { send: vi.fn().mockResolvedValue(sendOk) };
  return { service: new WithdrawalSmsService(prisma as unknown as PrismaService, sms as unknown as SmsService), prisma, sms };
}

describe('withdrawal decided SMS', () => {
  it('paid: amount and tracking code, in one segment (the code is dropped if it would not fit)', () => {
    expect(withdrawalText('withdrawal-paid', { amount: '۵۰۰٬۰۰۰', trackingCode: '140207150001' })).toBe('برداشت ۵۰۰٬۰۰۰ تومان به حسابتان واریز شد\nپیگیری: 140207150001');
    const long = withdrawalText('withdrawal-paid', { amount: '۵۰٬۰۰۰٬۰۰۰', trackingCode: 'X'.repeat(40) });
    expect(long).toBe('برداشت ۵۰٬۰۰۰٬۰۰۰ تومان به حسابتان واریز شد');
    expect(smsParts(withdrawalText('withdrawal-rejected', { amount: '۵۰٬۰۰۰٬۰۰۰', trackingCode: '' }))).toBe(1);
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
