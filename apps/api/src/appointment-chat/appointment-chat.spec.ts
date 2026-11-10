import { AppointmentChatService } from './appointment-chat.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';

const NOW = new Date('2026-11-07T08:00:00Z');
const appt = (over: Record<string, unknown> = {}) => ({
  id: 'ap1',
  status: 'CONFIRMED',
  startAt: new Date('2026-11-07T10:00:00Z'),
  endAt: new Date('2026-11-07T11:00:00Z'),
  customerId: 'cust',
  customerFirstName: null,
  customerLastName: null,
  chatCustomerReadAt: null,
  chatSalonReadAt: null,
  customer: { firstName: 'مریم', lastName: 'احمدی' },
  salon: { id: 'sal', name: 'سالن رز', ownerId: 'owner' },
  stylist: { id: 'st', userId: 'styl', displayName: 'سارا' },
  ...over,
});

function setup(a = appt(), unreadNotice: unknown = null) {
  const prisma = {
    appointment: { findUnique: vi.fn().mockResolvedValue(a), update: vi.fn() },
    appointmentMessage: { create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'm1', createdAt: NOW, ...data })), findMany: vi.fn().mockResolvedValue([]) },
    notification: { findFirst: vi.fn().mockResolvedValue(unreadNotice), updateMany: vi.fn() },
  };
  const notifications = { notify: vi.fn() };
  return { service: new AppointmentChatService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService), prisma, notifications };
}

describe('booking chat', () => {
  it("the customer's message goes to the owner and the stylist", async () => {
    const { service, prisma, notifications } = setup();
    await service.send({ sub: 'cust', role: 'CUSTOMER' } as never, 'ap1', '  دیر می‌رسم  ', NOW);
    expect(prisma.appointmentMessage.create).toHaveBeenCalledWith({ data: { appointmentId: 'ap1', side: 'CUSTOMER', senderId: 'cust', senderName: 'مریم احمدی', text: 'دیر می‌رسم' } });
    expect(notifications.notify.mock.calls.map((c) => c[0][0])).toEqual(['owner', 'styl']);
  });

  it("the stylist writes as themselves; the salon owner as the salon; the customer is told", async () => {
    const stylist = setup();
    await stylist.service.send({ sub: 'styl', role: 'STYLIST' } as never, 'ap1', 'مشکلی نیست', NOW);
    expect(stylist.prisma.appointmentMessage.create.mock.calls[0][0].data).toMatchObject({ side: 'SALON', senderName: 'سارا' });
    expect(stylist.notifications.notify).toHaveBeenCalledWith(['cust'], 'NEW_MESSAGE', expect.objectContaining({ from: 'SALON', appointmentId: 'ap1' }));
    const owner = setup();
    await owner.service.send({ sub: 'owner', role: 'SALON_OWNER' } as never, 'ap1', 'سلام', NOW);
    expect(owner.prisma.appointmentMessage.create.mock.calls[0][0].data).toMatchObject({ side: 'SALON', senderName: 'سالن رز' });
  });

  it("no second bell notice while one is unread; outsiders get 404; closed chats can't be written to", async () => {
    const quiet = setup(appt(), { id: 'n1' });
    await quiet.service.send({ sub: 'cust', role: 'CUSTOMER' } as never, 'ap1', 'باز هم', NOW);
    expect(quiet.notifications.notify).not.toHaveBeenCalled();
    const other = setup();
    await expect(other.service.list({ sub: 'someone', role: 'CUSTOMER' } as never, 'ap1')).rejects.toThrow(/not found/i);
    await expect(other.service.list({ sub: 'styl', role: 'SALON_OWNER' } as never, 'ap1')).rejects.toThrow(/not found/i);
    const cancelled = setup(appt({ status: 'CANCELLED' }));
    await expect(cancelled.service.send({ sub: 'cust', role: 'CUSTOMER' } as never, 'ap1', 'x', NOW)).rejects.toThrow(/closed/);
    const old = setup();
    await expect(old.service.send({ sub: 'cust', role: 'CUSTOMER' } as never, 'ap1', 'x', new Date('2026-11-08T12:00:00Z'))).rejects.toThrow(/closed/);
  });
});
