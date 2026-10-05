import { StalePrepaymentService } from './stale-prepayment.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';

const row = (id: string) => ({
  id, customerId: 'cust', prepaidToman: 40_000, prepaymentStatus: 'HELD', startAt: new Date('2026-10-01T08:00:00Z'),
  customerFirstName: null, customerLastName: null,
  salon: { ownerId: 'owner', name: 'سالن رز' }, stylist: { userId: 'sty', displayName: 'مریم' },
  customer: { firstName: 'سارا', lastName: 'احمدی' }, services: [{ service: { name: 'کوتاهی' } }],
});

function setup(rows: ReturnType<typeof row>[], claimedIds: string[]) {
  const moves: { userId: string; amount: number }[] = [];
  const tx = {
    appointment: {
      updateMany: vi.fn(({ where }) => Promise.resolve({ count: where.status === 'PENDING' ? (claimedIds.includes(where.id) ? 1 : 0) : 1 })),
    },
    $queryRaw: vi.fn((_s: TemplateStringsArray, amount: number, userId: string) => { moves.push({ userId, amount }); return Promise.resolve([{ walletBalance: amount }]); }),
    walletTransaction: { create: vi.fn() },
  };
  const prisma = { appointment: { findMany: vi.fn().mockResolvedValue(rows) }, $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
  const notifications = { notify: vi.fn().mockResolvedValue(undefined) };
  const service = new StalePrepaymentService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService);
  return { service, prisma, moves, notifications };
}

describe('unconfirmed prepaid bookings', () => {
  it('asks only for PENDING held bookings a day past their end', async () => {
    const { service, prisma } = setup([], []);
    const now = new Date('2026-10-05T12:00:00Z');
    await service.run(now);
    const where = prisma.appointment.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ status: 'PENDING', prepaymentStatus: 'HELD' });
    expect(where.endAt.lt.toISOString()).toBe('2026-10-04T12:00:00.000Z');
  });

  it('cancels, refunds the customer and tells everyone — skipping ones staff just changed', async () => {
    const { service, moves, notifications } = setup([row('a1'), row('a2')], ['a1']);
    expect(await service.run()).toBe(1);
    expect(moves).toEqual([{ userId: 'cust', amount: 40_000 }]);
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify.mock.calls[0][0]).toEqual(['owner', 'sty', 'cust']);
    expect(notifications.notify.mock.calls[0][2]).toMatchObject({ appointmentId: 'a1', cancelledBy: 'SYSTEM', customerName: 'سارا احمدی' });
  });
});
