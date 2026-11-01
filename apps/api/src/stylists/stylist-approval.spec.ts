import { StylistApproval } from '@appointment-scheduling/database';
import { StylistsService } from './stylists.service.js';
import { stylistApprovalText } from '../sms/sms.text.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type { SmsService } from '../sms/sms.service.js';
import type { SalonsService } from '../salons/salons.service.js';

// A stylist a salon invites waits for the platform admin's approval, separate from the salon's.

function setup(opts: { stylist?: Record<string, unknown>; seatFree?: boolean } = {}) {
  const stylist = {
    id: 'st1',
    userId: 'u2',
    salonId: 's1',
    displayName: 'مریم',
    active: false,
    approval: StylistApproval.PENDING,
    salon: { name: 'سالن رز', owner: { phone: '09120000000' } },
    ...opts.stylist,
  };
  const salon = { id: 's1', ownerId: 'owner', kind: 'SALON', name: 'سالن رز' };
  const tx = {
    user: { create: vi.fn().mockResolvedValue({ id: 'u2', mustSetPassword: true }) },
    stylist: { create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'st1', ...data })) },
    passwordSetupToken: { deleteMany: vi.fn(), create: vi.fn() },
  };
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
    stylist: {
      findUnique: vi.fn().mockResolvedValue(stylist),
      findUniqueOrThrow: vi.fn().mockResolvedValue(stylist),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...stylist, ...data })),
    },
    salon: { findUnique: vi.fn().mockResolvedValue(salon), findFirst: vi.fn().mockResolvedValue(salon) },
    $transaction: vi.fn().mockImplementation((arg: unknown) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg as Promise<unknown>[]))),
  };
  const salons = { findMine: vi.fn().mockResolvedValue(salon) };
  const subscriptions = {
    assertCanAddStylist: vi.fn().mockImplementation(() => (opts.seatFree === false ? Promise.reject(new Error('full')) : Promise.resolve())),
  };
  const sms = { notifyAdmin: vi.fn(), send: vi.fn().mockResolvedValue(true) };
  const service = new StylistsService(prisma as unknown as PrismaService, salons as unknown as SalonsService, subscriptions as unknown as SubscriptionsService, sms as unknown as SmsService);
  return { service, prisma, tx, sms };
}

describe('stylist approval', () => {
  it('an invited stylist is created pending and switched off', async () => {
    const { service, tx } = setup();
    await service.invite('owner', { phone: '09121111111', firstName: 'مریم', lastName: 'احمدی', displayName: 'مریم' });
    expect(tx.stylist.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ approval: 'PENDING', active: false }) }));
  });

  it("the owner can't switch on a stylist the admin hasn't approved", async () => {
    const pending = setup();
    await expect(pending.service.update('owner', 'st1', { active: true })).rejects.toThrow(/approval/);
    const rejected = setup({ stylist: { approval: StylistApproval.REJECTED } });
    await expect(rejected.service.update('owner', 'st1', { active: true })).rejects.toThrow(/approval/);
    const approved = setup({ stylist: { approval: StylistApproval.APPROVED } });
    await approved.service.update('owner', 'st1', { active: true });
    expect(approved.prisma.stylist.update).toHaveBeenCalledWith({ where: { id: 'st1' }, data: { active: true } });
  });

  it('approving switches the stylist on when a seat is free and texts the owner', async () => {
    const { service, prisma, sms } = setup();
    const now = new Date('2026-11-01T10:00:00Z');
    await expect(service.setApproval('st1', 'APPROVED', now)).resolves.toMatchObject({ approval: 'APPROVED', active: true });
    expect(prisma.stylist.update).toHaveBeenCalledWith(expect.objectContaining({ data: { approval: 'APPROVED', approvalDecidedAt: now, active: true } }));
    expect(sms.send).toHaveBeenCalledWith(expect.objectContaining({ kind: 'stylist-approval-owner', to: '09120000000' }));
  });

  it('approving with the plan full leaves the stylist off for the owner to switch on later', async () => {
    const { service } = setup({ seatFree: false });
    await expect(service.setApproval('st1', 'APPROVED')).resolves.toMatchObject({ approval: 'APPROVED', active: false });
  });

  it('rejecting keeps the stylist off; the same decision twice changes nothing', async () => {
    const { service, prisma } = setup();
    await expect(service.setApproval('st1', 'REJECTED')).resolves.toMatchObject({ approval: 'REJECTED', active: false });
    const again = setup({ stylist: { approval: StylistApproval.REJECTED } });
    await again.service.setApproval('st1', 'REJECTED');
    expect(again.prisma.stylist.update).not.toHaveBeenCalled();
    expect(again.sms.send).not.toHaveBeenCalled();
    expect(prisma.stylist.update).toHaveBeenCalledTimes(1);
  });

  it('the owner\'s SMS fits one segment', () => {
    const t = stylistApprovalText({ approved: true, name: 'مریم احمدی'.repeat(4), salon: 'سالن زیبایی رز سفید'.repeat(3) });
    expect(t.length).toBeLessThanOrEqual(70);
    expect(stylistApprovalText({ approved: false, name: 'مریم', salon: 'سالن رز' })).toBe('آرایشگر مریم در سالن رز تایید نشد؛ با پشتیبانی تماس بگیرید');
  });
});
