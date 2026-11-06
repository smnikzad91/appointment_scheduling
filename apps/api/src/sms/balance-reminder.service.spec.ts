import { BalanceReminderService } from './balance-reminder.service.js';
import { balanceReminderText } from './sms.text.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from './sms.service.js';
import type { ConfigService } from '@nestjs/config';

// 12:00 Tehran = 08:30 UTC
const NOON = new Date('2026-11-07T08:30:00Z');

function setup(rows: { id: string; phone?: string | null }[], claim = 1) {
  const prisma = {
    appointment: {
      findMany: vi.fn().mockResolvedValue(
        rows.map((r) => ({ id: r.id, balanceDueToman: 190_000, salon: { name: 'سالن رز', timezone: 'Asia/Tehran' }, stylist: { userId: 'u-st' }, customer: { phone: r.phone === undefined ? '09120000000' : r.phone } })),
      ),
      updateMany: vi.fn().mockResolvedValue({ count: claim }),
    },
  };
  const sms = { send: vi.fn().mockResolvedValue(true) };
  const service = new BalanceReminderService(prisma as unknown as PrismaService, sms as unknown as SmsService, { get: () => undefined } as unknown as ConfigService);
  service.sleep = async () => {};
  return { service, prisma, sms };
}

describe('BalanceReminderService', () => {
  it('texts each unpaid request once, charged to the stylist, after claiming it', async () => {
    const { service, prisma, sms } = setup([{ id: 'a1' }]);
    await expect(service.run(NOON)).resolves.toBe(1);
    const where = prisma.appointment.findMany.mock.calls[0][0].where;
    expect(where.balanceReminderSentAt).toBeNull();
    expect(where.balanceRequestedAt.lte).toEqual(new Date(NOON.getTime() - 3 * 86_400_000));
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({ where: { id: 'a1', balanceReminderSentAt: null, balancePaidAt: null }, data: { balanceReminderSentAt: NOON } });
    expect(sms.send).toHaveBeenCalledWith(expect.objectContaining({ kind: 'balance-reminder-customer', to: '09120000000' }), expect.objectContaining({ userId: 'u-st', appointmentId: 'a1' }));
  });

  it('skips one another instance claimed, and sends nothing at night', async () => {
    const claimed = setup([{ id: 'a1' }], 0);
    await expect(claimed.service.run(NOON)).resolves.toBe(0);
    expect(claimed.sms.send).not.toHaveBeenCalled();
    const night = setup([{ id: 'a1' }]);
    await expect(night.service.run(new Date('2026-11-07T20:00:00Z'))).resolves.toBe(0); // 23:30 Tehran
    expect(night.prisma.appointment.updateMany).not.toHaveBeenCalled();
  });

  it('the text fits one segment', () => {
    expect(balanceReminderText({ amount: '۱٬۹۰۰٬۰۰۰', salon: 'سالن زیبایی بسیار بزرگ و معروف رز سفید شهر' }).length).toBeLessThanOrEqual(70);
    expect(balanceReminderText({ amount: '۱۹۰٬۰۰۰', salon: 'سالن رز' })).toBe('یادآوری: باقی‌مانده نوبت سالن رز ۱۹۰٬۰۰۰ تومان؛ در پنل بپردازید');
  });
});
