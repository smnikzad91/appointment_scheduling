import { SmsService } from './sms.service.js';
import type { ConfigService } from '@nestjs/config';
import type { ErrorLogService } from '../error-log/error-log.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function setup(driverResult: { cost?: number } | Error) {
  const moves: { userId: string; amount: number; note?: string }[] = [];
  const tx = {
    $queryRaw: vi.fn((_s: TemplateStringsArray, amount: number, userId: string) => { moves.push({ userId, amount }); return Promise.resolve([{ walletBalance: amount }]); }),
    walletTransaction: { create: vi.fn(({ data }) => { moves[moves.length - 1].note = data.note; return Promise.resolve(data); }) },
  };
  const prisma = { $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
  const errors = { record: vi.fn() };
  const service = new SmsService({ get: () => undefined } as unknown as ConfigService, errors as unknown as ErrorLogService, prisma as unknown as PrismaService);
  // swap in a fake gateway
  (service as unknown as { driver: { name: string; send: () => Promise<unknown> } }).driver = {
    name: 'provider',
    send: () => (driverResult instanceof Error ? Promise.reject(driverResult) : Promise.resolve(driverResult)),
  };
  return { service, moves, errors };
}

const msg = { kind: 'reminder-customer', to: '0912', params: { time: '۱۰:۰۰', salon: 'رز', stylist: 'مریم' }, text: 'x' } as const;

describe('SMS cost charged to the booking stylist', () => {
  it("takes the gateway's cost from the payer's wallet, allowed into debt, with a note", async () => {
    const { service, moves } = setup({ cost: 200 });
    expect(await service.send(msg, { userId: 'sty', appointmentId: 'a1', note: 'یادآوری ۱ ساعته به مشتری' })).toBe(true);
    expect(moves).toEqual([{ userId: 'sty', amount: -200, note: 'یادآوری ۱ ساعته به مشتری' }]);
  });

  it('charges nothing without a payer (codes, wallet SMS), for a free send, or when sending failed', async () => {
    expect((await (async () => { const s = setup({ cost: 200 }); await s.service.send(msg); return s.moves; })())).toEqual([]);
    expect((await (async () => { const s = setup({}); await s.service.send(msg, { userId: 'sty', note: 'n' }); return s.moves; })())).toEqual([]);
    const failed = setup(new Error('notifycloud 500'));
    expect(await failed.service.send(msg, { userId: 'sty', note: 'n' })).toBe(false);
    expect(failed.moves).toEqual([]);
  });
});
