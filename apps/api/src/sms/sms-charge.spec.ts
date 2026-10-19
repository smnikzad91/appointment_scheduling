import { SmsService, SMS_DEBT_LIMIT_TOMAN } from './sms.service.js';
import type { ConfigService } from '@nestjs/config';
import type { ErrorLogService } from '../error-log/error-log.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function setup(driverResult: { cost?: number } | Error, { balance = 50_000, alreadyAsked = false } = {}) {
  const moves: { userId: string; amount: number; note?: string }[] = [];
  const sent: { kind: string; to: string; text: string }[] = [];
  const logs: { kind: string; status: string; costToman: number }[] = [];
  const tx = {
    $queryRaw: vi.fn((_s: TemplateStringsArray, amount: number, userId: string) => {
      moves.push({ userId, amount });
      return Promise.resolve([{ walletBalance: balance + amount }]);
    }),
    walletTransaction: { create: vi.fn(({ data }) => { moves[moves.length - 1].note = data.note; return Promise.resolve(data); }) },
  };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    user: {
      findUnique: vi.fn(() => Promise.resolve({ walletBalance: balance, phone: '0935' })),
      updateMany: vi.fn(() => Promise.resolve({ count: alreadyAsked ? 0 : 1 })),
    },
    smsLog: { create: vi.fn(({ data }) => { logs.push({ kind: data.kind, status: data.status, costToman: data.costToman }); return Promise.resolve(data); }) },
  };
  const errors = { record: vi.fn() };
  const service = new SmsService({ get: () => undefined } as unknown as ConfigService, errors as unknown as ErrorLogService, prisma as unknown as PrismaService);
  // swap in a fake gateway (the low-balance SMS to the stylist always goes through, free)
  (service as unknown as { driver: { name: string; send: (m: { kind: string; to: string; text: string }) => Promise<unknown> } }).driver = {
    name: 'provider',
    send: (m) => {
      if (m.kind === 'low-balance-stylist') { sent.push(m); return Promise.resolve({ cost: 150 }); }
      return driverResult instanceof Error ? Promise.reject(driverResult) : Promise.resolve(driverResult);
    },
  };
  return { service, moves, errors, sent, logs, prisma };
}

const msg = { kind: 'reminder-customer', to: '0912', params: { time: '۱۰:۰۰', salon: 'رز', stylist: 'مریم' }, text: 'x' } as const;
const charge = { userId: 'sty', appointmentId: 'a1', note: 'یادآوری ۱ ساعته به مشتری' };

describe('SMS cost charged to the booking stylist', () => {
  it("takes the gateway's cost from the payer's wallet, allowed into debt, with a note, and logs it", async () => {
    const { service, moves, logs, sent } = setup({ cost: 200 }, { balance: 0 });
    expect(await service.send(msg, charge)).toBe(true);
    expect(moves).toEqual([{ userId: 'sty', amount: -200, note: 'یادآوری ۱ ساعته به مشتری' }]);
    expect(logs).toEqual([{ kind: 'reminder-customer', status: 'SENT', costToman: 200 }]);
    expect(sent).toEqual([]);
  });

  it('charges nothing without a payer (codes, wallet SMS), for a free send, or when sending failed', async () => {
    expect((await (async () => { const s = setup({ cost: 200 }); await s.service.send(msg); return s.moves; })())).toEqual([]);
    expect((await (async () => { const s = setup({}); await s.service.send(msg, { userId: 'sty', note: 'n' }); return s.moves; })())).toEqual([]);
    const failed = setup(new Error('notifycloud 500'));
    expect(await failed.service.send(msg, { userId: 'sty', note: 'n' })).toBe(false);
    expect(failed.moves).toEqual([]);
    expect(failed.logs).toEqual([{ kind: 'reminder-customer', status: 'FAILED', costToman: 0 }]);
  });

  it('keeps sending while the wallet is above the debt limit', async () => {
    const { service, moves, sent } = setup({ cost: 200 }, { balance: SMS_DEBT_LIMIT_TOMAN + 1_000 });
    expect(await service.send(msg, charge)).toBe(true);
    expect(moves).toHaveLength(1);
    expect(sent).toEqual([]);
  });

  it('the SMS that takes the wallet to the limit is sent, then the stylist is asked to top up', async () => {
    const { service, sent } = setup({ cost: 200 }, { balance: SMS_DEBT_LIMIT_TOMAN + 100 });
    expect(await service.send(msg, charge)).toBe(true);
    expect(sent).toEqual([expect.objectContaining({ kind: 'low-balance-stylist', to: '0935' })]);
    expect(sent[0].text).toContain('منفی ۱۰٬۰۰۰ تومان');
  });

  it('at or below the limit: not sent, not charged, logged as skipped, stylist texted once a day', async () => {
    const { service, moves, logs, sent } = setup({ cost: 200 }, { balance: SMS_DEBT_LIMIT_TOMAN });
    expect(await service.send(msg, charge)).toBe(false);
    expect(moves).toEqual([]);
    expect(logs).toEqual([{ kind: 'reminder-customer', status: 'SKIPPED_LOW_BALANCE', costToman: 0 }]);
    expect(sent).toHaveLength(1);

    const again = setup({ cost: 200 }, { balance: SMS_DEBT_LIMIT_TOMAN - 500, alreadyAsked: true });
    expect(await again.service.send(msg, charge)).toBe(false);
    expect(again.sent).toEqual([]);
  });
});
