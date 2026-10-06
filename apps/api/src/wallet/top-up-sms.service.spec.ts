import { TopUpSmsService } from './top-up-sms.service.js';
import { smsParts, topUpPaidText, faMoney } from '../sms/sms.text.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from '../sms/sms.service.js';

const row = (id: string, phone: string | null = '09121234567', attempts = 0) => ({
  id, creditedToman: 300_045, paidSmsAttempts: attempts, user: { phone }, transaction: { balanceAfter: 610_400 },
});

function setup(rows: ReturnType<typeof row>[], { sendOk = true, claimable = rows.map((r) => r.id) } = {}) {
  const prisma = {
    walletTopUp: {
      findMany: vi.fn().mockResolvedValue(rows),
      updateMany: vi.fn(({ where }) => Promise.resolve({ count: claimable.includes(where.id) ? 1 : 0 })),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const sms = { send: vi.fn().mockResolvedValue(sendOk) };
  return { service: new TopUpSmsService(prisma as unknown as PrismaService, sms as unknown as SmsService), prisma, sms };
}

describe('top-up paid SMS', () => {
  it('fits one segment even for the largest top-up', () => {
    expect(smsParts(topUpPaidText({ amount: faMoney(5_000_000), balance: faMoney(999_999_999) }))).toBe(1);
  });

  it('texts the amount and the balance after it, once per top-up', async () => {
    const { service, sms } = setup([row('t1'), row('t2')], { claimable: ['t1'] });
    expect(await service.run()).toBe(1);
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(sms.send.mock.calls[0][0]).toMatchObject({ kind: 'topup-paid', to: '09121234567', params: { amount: '۳۰۰٬۰۴۵', balance: '۶۱۰٬۴۰۰' } });
    expect(sms.send.mock.calls[0][0].text).toBe('کیف پول نوبتت ۳۰۰٬۰۴۵ تومان شارژ شد\nموجودی: ۶۱۰٬۴۰۰ تومان');
  });

  it('releases a failed send for another try, and gives up after three', async () => {
    const { service, prisma } = setup([row('t1', '0912', 0), row('t2', '0912', 2)], { sendOk: false });
    await service.run();
    expect(prisma.walletTopUp.update.mock.calls[0][0]).toEqual({ where: { id: 't1' }, data: { paidSmsAttempts: 1, paidSmsAt: null } });
    expect(prisma.walletTopUp.update.mock.calls[1][0]).toEqual({ where: { id: 't2' }, data: { paidSmsAttempts: 3 } });
  });

  it('skips accounts without a phone number', async () => {
    const { service, sms } = setup([row('t1', null)]);
    expect(await service.run()).toBe(0);
    expect(sms.send).not.toHaveBeenCalled();
  });
});
