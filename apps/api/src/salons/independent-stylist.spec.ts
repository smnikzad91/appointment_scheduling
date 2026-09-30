import { Role, SalonKind, ServiceLocation } from '@appointment-scheduling/database';
import { roleSatisfies } from '../auth/guards/roles.guard.js';
import { hasPrivateAddress, publicLocation } from './public-location.util.js';
import { AppointmentsService } from '../appointments/appointments.service.js';
import { StylistsService } from '../stylists/stylists.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { WaitlistService } from '../waitlist/waitlist.service.js';
import type { SmsService } from '../sms/sms.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type { SalonsService } from './salons.service.js';

describe('roleSatisfies', () => {
  it('lets an independent stylist use owner and stylist routes, nothing else', () => {
    expect(roleSatisfies(Role.INDEPENDENT_STYLIST, Role.SALON_OWNER)).toBe(true);
    expect(roleSatisfies(Role.INDEPENDENT_STYLIST, Role.STYLIST)).toBe(true);
    expect(roleSatisfies(Role.INDEPENDENT_STYLIST, Role.PLATFORM_ADMIN)).toBe(false);
    expect(roleSatisfies(Role.INDEPENDENT_STYLIST, Role.CUSTOMER)).toBe(false);
  });

  it('changes nothing for the other roles', () => {
    expect(roleSatisfies(Role.STYLIST, Role.SALON_OWNER)).toBe(false);
    expect(roleSatisfies(Role.SALON_OWNER, Role.STYLIST)).toBe(false);
    expect(roleSatisfies(Role.SALON_OWNER, Role.SALON_OWNER)).toBe(true);
  });
});

describe('publicLocation', () => {
  const base = { address: 'خیابان آزادی، کوچه ۳، پلاک ۱۲', latitude: 36.463712, longitude: 52.861549 };

  it('keeps a salon and an independent studio as given', () => {
    expect(publicLocation({ ...base, kind: SalonKind.SALON, serviceLocations: [] })).toMatchObject({ ...base, approximateLocation: false });
    const studio = { ...base, kind: SalonKind.INDEPENDENT, serviceLocations: [ServiceLocation.STUDIO, ServiceLocation.CLIENT_HOME] };
    expect(publicLocation(studio)).toMatchObject({ ...base, approximateLocation: false });
  });

  it('shows the address of the salon an independent stylist works in (the usual case)', () => {
    const inSalon = { ...base, kind: SalonKind.INDEPENDENT, serviceLocations: [ServiceLocation.IN_SALON, ServiceLocation.CLIENT_HOME] };
    expect(hasPrivateAddress(inSalon)).toBe(false);
    expect(publicLocation(inSalon)).toMatchObject({ ...base, approximateLocation: false });
  });

  it('hides a home address and rounds the pin to ~1 km', () => {
    const home = { ...base, kind: SalonKind.INDEPENDENT, serviceLocations: [ServiceLocation.HOME, ServiceLocation.CLIENT_HOME] };
    expect(hasPrivateAddress(home)).toBe(true);
    expect(publicLocation(home)).toMatchObject({ address: null, latitude: 36.46, longitude: 52.86, approximateLocation: true });
  });
});

describe('booking place (independent stylists)', () => {
  function setup(salon: { kind: SalonKind; serviceLocations: ServiceLocation[] }) {
    const prisma = { salon: { findUnique: vi.fn().mockResolvedValue(salon) } };
    const service = new AppointmentsService(
      prisma as unknown as PrismaService,
      {} as NotificationsService,
      {} as WaitlistService,
      {} as SmsService,
      {} as SubscriptionsService,
    );
    // bookingPlace is private; exercised directly to keep the test away from the booking transaction.
    const place = (dto: object, bySalon = false) =>
      (service as unknown as { bookingPlace: (d: object, b: boolean) => Promise<unknown> }).bookingPlace({ salonId: 's1', serviceIds: [], startAt: '', ...dto }, bySalon);
    return { place };
  }

  it('a salon never records a place', async () => {
    const { place } = setup({ kind: SalonKind.SALON, serviceLocations: [] });
    await expect(place({ serviceLocation: ServiceLocation.CLIENT_HOME, visitAddress: 'x' })).resolves.toEqual({ serviceLocation: null, visitAddress: null });
  });

  it('uses the only place offered by default', async () => {
    const { place } = setup({ kind: SalonKind.INDEPENDENT, serviceLocations: [ServiceLocation.STUDIO] });
    await expect(place({})).resolves.toEqual({ serviceLocation: ServiceLocation.STUDIO, visitAddress: null });
  });

  it('asks the customer to choose among several, but lets the stylist leave it open', async () => {
    const { place } = setup({ kind: SalonKind.INDEPENDENT, serviceLocations: [ServiceLocation.HOME, ServiceLocation.CLIENT_HOME] });
    await expect(place({})).rejects.toThrow(/Choose where/);
    await expect(place({}, true)).resolves.toEqual({ serviceLocation: null, visitAddress: null });
  });

  it('refuses a place they do not offer, and a home visit without an address', async () => {
    const { place } = setup({ kind: SalonKind.INDEPENDENT, serviceLocations: [ServiceLocation.CLIENT_HOME] });
    await expect(place({ serviceLocation: ServiceLocation.STUDIO })).rejects.toThrow(/doesn't work at that place/);
    await expect(place({ visitAddress: '  ' })).rejects.toThrow(/address for the home visit/);
    await expect(place({ visitAddress: ' ساری، خیابان فرهنگ ' })).resolves.toEqual({
      serviceLocation: ServiceLocation.CLIENT_HOME,
      visitAddress: 'ساری، خیابان فرهنگ',
    });
  });
});

describe('StylistsService for an independent stylist', () => {
  function setup(kind: SalonKind) {
    const prisma = {
      stylist: { findUnique: vi.fn().mockResolvedValue({ id: 'st1', userId: 'u1', salonId: 's1', active: true }), update: vi.fn() },
      user: { update: vi.fn() },
      $transaction: vi.fn(),
    };
    const salons = { findMine: vi.fn().mockResolvedValue({ id: 's1', ownerId: 'u1', kind }) };
    const subscriptions = { assertCanAddStylist: vi.fn() };
    const service = new StylistsService(prisma as unknown as PrismaService, salons as unknown as SalonsService, subscriptions as unknown as SubscriptionsService);
    return { service, prisma };
  }

  it("can't add stylists", async () => {
    const { service } = setup(SalonKind.INDEPENDENT);
    await expect(service.invite('u1', { phone: '09120000000', firstName: 'a', lastName: 'b', displayName: 'a' })).rejects.toThrow(/works alone/);
  });
});

describe('stylistNewBookingText home-visit hint', () => {
  it('marks a home visit and always fits one segment', async () => {
    const { stylistNewBookingText, SMS_SEGMENT } = await import('../sms/sms.text.js');
    const short = stylistNewBookingText({ day: 'شنبه ۵ مهر', time: '۱۰:۰۰', customer: 'سارا', homeVisit: true });
    expect(short).toContain('نوبت در منزل سارا');
    expect(short.length).toBeLessThanOrEqual(SMS_SEGMENT);
    const long = stylistNewBookingText({ day: 'پنجشنبه ۲۲ اردیبهشت', time: '۱۴:۳۰', customer: 'سارا احمدی نژاد', homeVisit: true });
    expect(long.length).toBeLessThanOrEqual(SMS_SEGMENT);
    expect(long).toContain('نوبت در منزل');
  });
});

describe('resolveBookingPlace', () => {
  it('lets staff leave the place open or clear it, and still needs an address for a home visit', async () => {
    const { resolveBookingPlace } = await import('../appointments/appointments.service.js');
    const indie = { kind: SalonKind.INDEPENDENT, serviceLocations: [ServiceLocation.STUDIO, ServiceLocation.CLIENT_HOME] };
    expect(resolveBookingPlace(indie, null, null, true)).toEqual({ serviceLocation: null, visitAddress: null });
    expect(resolveBookingPlace(indie, ServiceLocation.STUDIO, 'ignored', true)).toEqual({ serviceLocation: ServiceLocation.STUDIO, visitAddress: null });
    expect(() => resolveBookingPlace(indie, ServiceLocation.CLIENT_HOME, null, true)).toThrow(/address for the home visit/);
  });
});
