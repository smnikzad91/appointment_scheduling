import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppointmentsService } from './appointments.service.js';
import { bookingCustomerFullName, bookingCustomerName, withBookingCustomerName } from './booking-customer-name.util.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { WaitlistService } from '../waitlist/waitlist.service.js';
import type { SmsService } from '../sms/sms.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type { JwtPayload } from '../auth/auth.service.js';

const account = { firstName: 'نگار', lastName: 'رضایی' };

describe('bookingCustomerName', () => {
  it('uses the account name when the booking has none', () => {
    expect(bookingCustomerName({ customerFirstName: null, customerLastName: null, customer: account })).toEqual(account);
  });

  it('prefers the name set on the booking, field by field', () => {
    expect(bookingCustomerName({ customerFirstName: 'نگار جان', customerLastName: null, customer: account })).toEqual({ firstName: 'نگار جان', lastName: 'رضایی' });
    expect(bookingCustomerFullName({ customerFirstName: 'سارا', customerLastName: 'احمدی', customer: account })).toBe('سارا احمدی');
  });

  it('overlays the booking name on the row, leaving the rest of the customer as is', () => {
    const row = withBookingCustomerName({ id: 'a1', customerFirstName: 'سارا', customerLastName: null, customer: { ...account, phone: '0912' } });
    expect(row.customer).toEqual({ firstName: 'سارا', lastName: 'رضایی', phone: '0912' });
  });
});

describe('UpdateAppointmentDto customer name', () => {
  const check = async (body: object) => {
    const dto = plainToInstance(UpdateAppointmentDto, body);
    return { dto, errors: await validate(dto) };
  };

  it('trims the names', async () => {
    const { dto, errors } = await check({ customerFirstName: '  سارا ', customerLastName: ' احمدی  ' });
    expect(errors).toHaveLength(0);
    expect(dto).toMatchObject({ customerFirstName: 'سارا', customerLastName: 'احمدی' });
  });

  it('accepts null (back to the account name) and rejects over-long names', async () => {
    expect((await check({ customerFirstName: null, customerLastName: null })).errors).toHaveLength(0);
    expect((await check({ customerFirstName: 'ا'.repeat(51) })).errors).toHaveLength(1);
  });
});

describe('AppointmentsService.updateDetails customer name', () => {
  function setup() {
    const appointment = {
      id: 'appt-1',
      status: 'CONFIRMED',
      salonId: 'salon-1',
      stylistId: 'sty-1',
      customerId: 'cust-1',
      startAt: new Date(Date.now() + 2 * 3600_000),
      endAt: new Date(Date.now() + 2.5 * 3600_000),
      services: [{ serviceId: 'svc-1', priceToman: 100_000, durationMinutes: 30 }],
      salon: { timezone: 'Asia/Tehran' },
    };
    const tx = { appointment: { update: vi.fn().mockResolvedValue({ id: 'appt-1' }) }, appointmentService: { deleteMany: vi.fn(), createMany: vi.fn() } };
    const prisma = {
      appointment: { findUnique: vi.fn().mockResolvedValue(appointment) },
      salon: { findUnique: vi.fn().mockResolvedValue({ id: 'salon-1', ownerId: 'owner-1' }) },
      stylist: { findUnique: vi.fn().mockResolvedValue({ id: 'sty-1' }) },
      user: { update: vi.fn() },
      $transaction: vi.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const notifications = { notify: vi.fn() };
    const sms = { send: vi.fn() };
    const service = new AppointmentsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      { notifyOpening: vi.fn() } as unknown as WaitlistService,
      sms as unknown as SmsService,
      { takeReminderSms: vi.fn() } as unknown as SubscriptionsService,
    );
    return { service, prisma, tx, notifications, sms };
  }

  it.each([
    ['the salon owner', { sub: 'owner-1', role: 'SALON_OWNER' }],
    ['the booking’s stylist', { sub: 'sty-user-1', role: 'STYLIST' }],
  ])('%s can set the name on this booking only — no SMS, no notification, account untouched', async (_, user) => {
    const { service, prisma, tx, notifications, sms } = setup();
    await service.updateDetails(user as JwtPayload, 'appt-1', { customerFirstName: 'سارا', customerLastName: 'احمدی' });
    expect(tx.appointment.update.mock.calls[0][0].data).toMatchObject({ customerFirstName: 'سارا', customerLastName: 'احمدی' });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('a blank name goes back to the account name (null)', async () => {
    const { service, tx } = setup();
    await service.updateDetails({ sub: 'owner-1', role: 'SALON_OWNER' } as JwtPayload, 'appt-1', { customerFirstName: '', customerLastName: null });
    expect(tx.appointment.update.mock.calls[0][0].data).toMatchObject({ customerFirstName: null, customerLastName: null });
  });

  it('another salon’s owner cannot rename it', async () => {
    const { service } = setup();
    await expect(service.updateDetails({ sub: 'someone-else', role: 'SALON_OWNER' } as JwtPayload, 'appt-1', { customerFirstName: 'x' })).rejects.toThrow(/Not your salon/);
  });
});
