import { RebookReminderService } from './rebook-reminder.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from './sms.service.js';
import type { ConfigService } from '@nestjs/config';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

const at = (iso: string) => new Date(`${iso}+03:30`); // Tehran wall time
const NOON = at('2026-10-05T12:00:00');

function appt(over: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    salonId: 's1',
    customerId: 'c1',
    startAt: at('2026-09-05T16:00:00'), // 30 days before 2026-10-05
    rebookReminderAttempts: 0,
    salon: { name: 'سالن رز', slug: 'salon-rose', timezone: 'Asia/Tehran' },
    stylist: { displayName: 'سارا', services: [] as { serviceId: string; overrideRebookReminderEnabled: boolean | null; overrideRebookReminderDays: number | null }[] },
    customer: { firstName: 'نگار', phone: '09120000001' },
    services: [{ service: { id: 'svc1', name: 'کوتاهی مو', rebookReminderEnabled: true, rebookReminderDays: 30 } }],
    ...over,
  };
}

function setup(rows: ReturnType<typeof appt>[], { claim = 1, rebooked = false, allowance = true, sendOk = true } = {}) {
  const prisma = {
    appointment: {
      findMany: vi.fn().mockResolvedValue(rows),
      findFirst: vi.fn().mockResolvedValue(rebooked ? { id: 'next' } : null),
      updateMany: vi.fn().mockResolvedValue({ count: claim }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const sms = { send: vi.fn().mockResolvedValue(sendOk) };
  const subscriptions = { takeReminderSms: vi.fn().mockResolvedValue(allowance) };
  const config = { get: (k: string) => ({ SMS_OTP_DOMAIN: 'dev-iot.ir' })[k] } as unknown as ConfigService;
  const service = new RebookReminderService(prisma as unknown as PrismaService, sms as unknown as SmsService, config, subscriptions as unknown as SubscriptionsService);
  service.sleep = vi.fn().mockResolvedValue(undefined);
  return { service, prisma, sms, subscriptions };
}

describe('RebookReminderService', () => {
  it('texts the customer 30 days after a completed appointment, at noon, with a booking link', async () => {
    const { service, sms, prisma, subscriptions } = setup([appt()]);
    expect(await service.run(NOON)).toBe(1);

    const where = prisma.appointment.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ status: 'COMPLETED', rebookReminderSentAt: null });
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: 'a1', rebookReminderSentAt: null, rebookReminderAttempts: 0 },
      data: { rebookReminderSentAt: NOON, rebookReminderAttempts: { increment: 1 } },
    });
    expect(subscriptions.takeReminderSms).toHaveBeenCalledWith('s1', NOON);
    const msg = sms.send.mock.calls[0][0];
    expect(msg).toMatchObject({ kind: 'rebook-customer', to: '09120000001', params: { customer: 'نگار', days: '۳۰', service: 'کوتاهی مو', salon: 'سالن رز' } });
    expect(msg.params.link).toBe('https://dev-iot.ir/s/salon-rose?book=1');
    expect(msg.text).toContain('https://dev-iot.ir/s/salon-rose?book=1');
    expect(msg.text.length).toBeLessThanOrEqual(134);
  });

  it('waits for noon Tehran time, and stops before quiet hours', async () => {
    for (const time of ['2026-10-05T11:55:00', '2026-10-05T22:00:00']) {
      const { service, sms } = setup([appt()]);
      expect(await service.run(at(time))).toBe(0);
      expect(sms.send).not.toHaveBeenCalled();
    }
    const late = setup([appt()]); // missed noon (restart): still the same afternoon
    expect(await late.service.run(at('2026-10-05T15:40:00'))).toBe(1);
  });

  it('leaves appointments that are not due yet, and closes ones whose day has passed', async () => {
    const notYet = setup([appt({ startAt: at('2026-09-06T16:00:00') })]);
    expect(await notYet.service.run(NOON)).toBe(0);
    expect(notYet.prisma.appointment.update).not.toHaveBeenCalled();

    const missed = setup([appt({ startAt: at('2026-09-03T16:00:00') })]);
    expect(await missed.service.run(NOON)).toBe(0);
    expect(missed.sms.send).not.toHaveBeenCalled();
    expect(missed.prisma.appointment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { rebookReminderSentAt: expect.any(Date) } });
  });

  it("uses the stylist's own setting over the service's", async () => {
    const override = { serviceId: 'svc1', overrideRebookReminderEnabled: null, overrideRebookReminderDays: 14 };
    const due = setup([appt({ startAt: at('2026-09-21T16:00:00'), stylist: { displayName: 'سارا', services: [override] } })]);
    expect(await due.service.run(NOON)).toBe(1);
    expect(due.sms.send.mock.calls[0][0].params.days).toBe('۱۴');

    const off = { serviceId: 'svc1', overrideRebookReminderEnabled: false, overrideRebookReminderDays: null };
    const disabled = setup([appt({ stylist: { displayName: 'سارا', services: [off] } })]);
    expect(await disabled.service.run(NOON)).toBe(0);
    expect(disabled.prisma.appointment.updateMany).not.toHaveBeenCalled();
  });

  it('with several services, the one due soonest decides', async () => {
    const services = [
      { service: { id: 'svc1', name: 'رنگ مو', rebookReminderEnabled: true, rebookReminderDays: 60 } },
      { service: { id: 'svc2', name: 'کوتاهی مو', rebookReminderEnabled: true, rebookReminderDays: 30 } },
      { service: { id: 'svc3', name: 'براشینگ', rebookReminderEnabled: false, rebookReminderDays: 7 } },
    ];
    const { service, sms } = setup([appt({ services })]);
    expect(await service.run(NOON)).toBe(1);
    expect(sms.send.mock.calls[0][0].params.service).toBe('کوتاهی مو');
  });

  it('sends nothing when the customer already booked again, or another instance claimed it', async () => {
    const rebooked = setup([appt()], { rebooked: true });
    expect(await rebooked.service.run(NOON)).toBe(0);
    expect(rebooked.sms.send).not.toHaveBeenCalled();
    expect(rebooked.subscriptions.takeReminderSms).not.toHaveBeenCalled();

    const claimed = setup([appt()], { claim: 0 });
    expect(await claimed.service.run(NOON)).toBe(0);
    expect(claimed.sms.send).not.toHaveBeenCalled();
  });

  it('releases a failed send for a retry, and never charges the allowance twice', async () => {
    const failed = setup([appt()], { sendOk: false });
    expect(await failed.service.run(NOON)).toBe(0);
    expect(failed.prisma.appointment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { rebookReminderSentAt: null } });

    const retry = setup([appt({ rebookReminderAttempts: 1 })]);
    expect(await retry.service.run(at('2026-10-05T12:05:00'))).toBe(1);
    expect(retry.subscriptions.takeReminderSms).not.toHaveBeenCalled();

    const lastTry = setup([appt({ rebookReminderAttempts: 2 })], { sendOk: false });
    await lastTry.service.run(NOON);
    expect(lastTry.prisma.appointment.update).not.toHaveBeenCalled(); // stays claimed: given up
  });

  it('skips when the plan allowance is used up', async () => {
    const { service, sms } = setup([appt()], { allowance: false });
    expect(await service.run(NOON)).toBe(0);
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('sends at most 20 per run, spaced out for the gateway', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => appt({ id: `a${i}`, customerId: `c${i}` }));
    const { service, sms } = setup(rows);
    expect(await service.run(NOON)).toBe(20);
    expect(sms.send).toHaveBeenCalledTimes(20);
    expect(service.sleep).toHaveBeenCalledTimes(19);
    expect(service.sleep).toHaveBeenCalledWith(2_500);
  });

  it('keeps long names within two SMS segments without cutting the link', async () => {
    const long = appt({
      customer: { firstName: 'فاطمه‌السادات', phone: '09120000001' },
      salon: { name: 'سالن زیبایی بین‌المللی ملکه‌های شهر تهران', slug: 'salon-malake-tehran', timezone: 'Asia/Tehran' },
      services: [{ service: { id: 'svc1', name: 'کراتینه و احیای موی آسیب‌دیده با پروتئین', rebookReminderEnabled: true, rebookReminderDays: 30 } }],
    });
    const { service, sms } = setup([long]);
    await service.run(NOON);
    const text: string = sms.send.mock.calls[0][0].text;
    expect(text.length).toBeLessThanOrEqual(134);
    expect(text.endsWith('https://dev-iot.ir/s/salon-malake-tehran?book=1')).toBe(true);
  });
});
