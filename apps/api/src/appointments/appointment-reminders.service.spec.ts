import { AppointmentRemindersService } from './appointment-reminders.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotifycloudService } from '../sms/notifycloud.service.js';
import type { ConfigService } from '@nestjs/config';

const HOUR = 60 * 60_000;
// 12:00 in Tehran (UTC+3:30).
const noonTehran = new Date('2099-01-01T08:30:00Z');

function appt(overrides: { id?: string; startAt?: Date; createdAt?: Date; phone?: string | null } = {}) {
  return {
    id: overrides.id ?? 'appt-1',
    startAt: overrides.startAt ?? new Date(noonTehran.getTime() + 2 * HOUR),
    createdAt: overrides.createdAt ?? new Date(noonTehran.getTime() - 24 * HOUR),
    salon: { name: 'سالن رز', timezone: 'Asia/Tehran' },
    stylist: { displayName: 'مریم' },
    customer: { phone: overrides.phone === undefined ? '09121234567' : overrides.phone },
  };
}

function setup(due: ReturnType<typeof appt>[], { smsEnabled = true, claimed = 1 } = {}) {
  const prisma = {
    appointment: {
      findMany: vi.fn().mockResolvedValue(due),
      updateMany: vi.fn().mockResolvedValue({ count: claimed }),
    },
  };
  const sms = { enabled: smsEnabled, sendSms: vi.fn().mockResolvedValue({ id: 'sms-1' }) };
  const config = { get: vi.fn((_key: string, fallback: string) => fallback) };
  const service = new AppointmentRemindersService(
    prisma as unknown as PrismaService,
    sms as unknown as NotifycloudService,
    config as unknown as ConfigService,
  );
  return { service, prisma, sms };
}

describe('AppointmentRemindersService.runOnce', () => {
  it('looks for active appointments starting within the next 3 hours', async () => {
    const { service, prisma } = setup([]);
    await service.runOnce(noonTehran);

    const { where } = prisma.appointment.findMany.mock.calls[0][0];
    expect(where.reminderSentAt).toBeNull();
    expect(where.status.in).toEqual(['PENDING', 'CONFIRMED']);
    expect(where.startAt.lte.getTime() - noonTehran.getTime()).toBe(3 * HOUR);
  });

  it('claims the appointment, then texts the customer', async () => {
    const { service, prisma, sms } = setup([appt()]);
    expect(await service.runOnce(noonTehran)).toBe(1);

    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: 'appt-1', reminderSentAt: null },
      data: { reminderSentAt: noonTehran },
    });
    const [number, text, clientSmsId] = sms.sendSms.mock.calls[0];
    expect(number).toBe('09121234567');
    expect(text).toContain('یادآوری');
    expect(clientSmsId).toBe('appt-1:reminder');
  });

  it('does not send when another instance claimed it first', async () => {
    const { service, sms } = setup([appt()], { claimed: 0 });
    expect(await service.runOnce(noonTehran)).toBe(0);
    expect(sms.sendSms).not.toHaveBeenCalled();
  });

  it('marks a booking made inside the window as handled without texting', async () => {
    const booked = appt({ createdAt: new Date(noonTehran.getTime() - 10 * 60_000) });
    const { service, prisma, sms } = setup([booked]);
    await service.runOnce(noonTehran);

    expect(prisma.appointment.updateMany).toHaveBeenCalled();
    expect(sms.sendSms).not.toHaveBeenCalled();
  });

  it('waits out the night (salon time) and leaves it for later', async () => {
    const lateNight = new Date('2099-01-01T20:00:00Z'); // 23:30 in Tehran
    const { service, prisma, sms } = setup([appt({ startAt: new Date(lateNight.getTime() + 2 * HOUR) })]);
    await service.runOnce(lateNight);

    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
    expect(sms.sendSms).not.toHaveBeenCalled();
  });

  it('keeps going when one send fails', async () => {
    const { service, sms } = setup([appt({ id: 'a' }), appt({ id: 'b' })]);
    sms.sendSms.mockRejectedValueOnce(new Error('Rate limit exceeded. Please slow down.'));
    expect(await service.runOnce(noonTehran)).toBe(1);
    expect(sms.sendSms).toHaveBeenCalledTimes(2);
  });

  it('does nothing without an API key', async () => {
    const { service, prisma } = setup([appt()], { smsEnabled: false });
    expect(await service.runOnce(noonTehran)).toBe(0);
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });
});
