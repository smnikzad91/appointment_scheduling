import { WaitlistService, HOLD_MINUTES } from './waitlist.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';

// A cancelled time goes to the first customer on the waitlist for HOLD_MINUTES, then to everyone else.

const NOW = new Date('2026-11-07T08:00:00Z');
const START = new Date('2026-11-07T12:00:00Z');
const END = new Date('2026-11-07T13:00:00Z');
const entry = (id: string, customerId: string) => ({ id, customerId, stylistId: null, serviceIds: ['s1'], stylist: null });

function setup(entries = [entry('w1', 'c1'), entry('w2', 'c2')]) {
  const prisma = {
    salon: { findUnique: vi.fn().mockResolvedValue({ name: 'سالن رز', slug: 'rose', timezone: 'Asia/Tehran' }) },
    waitlistEntry: { findMany: vi.fn().mockResolvedValue(entries), updateMany: vi.fn() },
    slotHold: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'h1', ...data })),
      findMany: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn(),
    },
    appointment: { findFirst: vi.fn().mockResolvedValue(null) },
  };
  const notifications = { notify: vi.fn() };
  const service = new WaitlistService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService);
  return { service, prisma, notifications };
}

const cancelled = { salonId: 'sal', stylistId: 'st1', customerId: 'c0', startAt: START, endAt: END };

describe('waitlist hold', () => {
  it('holds the freed time for the first in line only, for 15 minutes', async () => {
    const { service, prisma, notifications } = setup();
    await service.notifyOpening(cancelled, NOW);
    expect(prisma.slotHold.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ stylistId: 'st1', customerId: 'c1', startAt: START, endAt: END, expiresAt: new Date(NOW.getTime() + HOLD_MINUTES * 60_000) }),
    });
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify.mock.calls[0][0]).toEqual(['c1']);
    expect(notifications.notify.mock.calls[0][2].hold).toMatchObject({ startAt: START.toISOString() });
    expect(prisma.waitlistEntry.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['w1'] } }, data: { notifiedAt: expect.any(Date) } });
  });

  it('tells everyone at once when the time starts too soon to hold it', async () => {
    const { service, prisma, notifications } = setup();
    await service.notifyOpening({ ...cancelled, startAt: new Date(NOW.getTime() + 3 * 60_000) }, NOW);
    expect(prisma.slotHold.create).not.toHaveBeenCalled();
    expect(notifications.notify).toHaveBeenCalledTimes(2);
  });

  it('when the hold runs out and the time is still free, the others are told', async () => {
    const { service, prisma, notifications } = setup([entry('w2', 'c2')]);
    prisma.slotHold.findMany.mockResolvedValue([{ id: 'h1', salonId: 'sal', stylistId: 'st1', customerId: 'c1', startAt: START, endAt: END }]);
    await service.releaseExpiredHolds(new Date(NOW.getTime() + 16 * 60_000));
    expect(prisma.slotHold.updateMany).toHaveBeenCalledWith({ where: { id: 'h1', releasedAt: null }, data: { releasedAt: expect.any(Date) } });
    expect(notifications.notify).toHaveBeenCalledWith(['c2'], 'SLOT_OPENED', expect.not.objectContaining({ hold: expect.anything() }));
  });

  it('nobody else is told when the time was booked meanwhile', async () => {
    const { service, prisma, notifications } = setup([entry('w2', 'c2')]);
    prisma.slotHold.findMany.mockResolvedValue([{ id: 'h1', salonId: 'sal', stylistId: 'st1', customerId: 'c1', startAt: START, endAt: END }]);
    prisma.appointment.findFirst.mockResolvedValue({ id: 'a9' });
    await service.releaseExpiredHolds(new Date(NOW.getTime() + 16 * 60_000));
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
