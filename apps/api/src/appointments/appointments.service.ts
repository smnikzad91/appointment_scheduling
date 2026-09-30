import { bookingCustomerFullName, withBookingCustomerName } from "./booking-customer-name.util.js";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { AppointmentStatus, NotificationType, Role, SalonKind, ServiceLocation } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { JwtPayload } from "../auth/auth.service.js";
import { findEligibleStylists } from "../salons/eligible-stylists.util.js";
import { hasPrivateAddress, publicLocation } from "../salons/public-location.util.js";
import { effectiveServicePricing, sumEffectivePricing } from "../salons/service-pricing.util.js";
import { CreateAppointmentDto, CreateSalonAppointmentDto } from "./dto/create-appointment.dto.js";
import { instantToSalonWallTime, salonWallTimeToInstant } from "../availability/salon-time.util.js";
import { UpdatableAppointmentStatus } from "./dto/update-status.dto.js";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto.js";
import { fitsWorkingHours } from "./working-hours.util.js";
import { effectiveCommissionPercent, splitCharge } from "../accounting/share.util.js";
import { NotificationsService, type BookingData } from "../notifications/notifications.service.js";
import { WaitlistService } from "../waitlist/waitlist.service.js";
import { SmsService } from "../sms/sms.service.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";
import { clock, customerBookingText, independentBookingText, jalaliDay, smsParts } from "../sms/sms.text.js";

type CustomerSmsKind = "booked-customer" | "rescheduled-customer" | "cancelled-customer" | "confirmed-customer";

const ACTIVE_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

const APPOINTMENT_INCLUDE = {
  salon: true,
  services: { include: { service: true } },
  reviews: { select: { id: true, target: true, rating: true, comment: true, status: true } },
} as const;

// Never `customer: true` / `user: true` on a relation to the User model — that returns every
// column including passwordHash. Always select only what the viewer (stylist/owner) needs to see.
const SAFE_CUSTOMER_SELECT = { select: { id: true, firstName: true, lastName: true, phone: true, avatarUrl: true } } as const;

/**
 * Where an independent stylist's booking happens: one of the places they work (the only one by
 * default); a home visit needs the customer's address. Salons have no choice — always null.
 * `openAllowed` (staff): with several places, it may be left unspecified; online the customer picks.
 */
export function resolveBookingPlace(
  salon: { kind: SalonKind; serviceLocations: ServiceLocation[] },
  requested: ServiceLocation | null | undefined,
  address: string | null | undefined,
  openAllowed: boolean,
): { serviceLocation: ServiceLocation | null; visitAddress: string | null } {
  if (salon.kind !== SalonKind.INDEPENDENT) return { serviceLocation: null, visitAddress: null };
  const offered = salon.serviceLocations;
  const serviceLocation = requested ?? (offered.length === 1 ? offered[0] : undefined);
  if (!serviceLocation) {
    if (openAllowed) return { serviceLocation: null, visitAddress: null };
    throw new BadRequestException("Choose where the appointment takes place");
  }
  if (!offered.includes(serviceLocation)) throw new BadRequestException("This stylist doesn't work at that place");
  if (serviceLocation !== ServiceLocation.CLIENT_HOME) return { serviceLocation, visitAddress: null };
  const visitAddress = address?.trim();
  if (!visitAddress || visitAddress.length < 5) throw new BadRequestException("Enter the address for the home visit");
  return { serviceLocation, visitAddress };
}

/**
 * A booking as its customer sees it. An independent stylist's private (home) address is theirs to
 * know only when the appointment is at the stylist's home; a home visit or an unspecified place
 * gets the salon as the public sees it (no address, rounded pin).
 */
export function forCustomer<T extends { serviceLocation: ServiceLocation | null; salon: Parameters<typeof publicLocation>[0] }>(appointment: T) {
  const { salon } = appointment;
  if (!hasPrivateAddress(salon) || appointment.serviceLocation === ServiceLocation.HOME) return appointment;
  return { ...appointment, salon: publicLocation(salon) };
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly waitlist: WaitlistService,
    private readonly sms: SmsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async create(customerId: string, dto: CreateAppointmentDto) {
    const salon = await this.prisma.salon.findUnique({ where: { id: dto.salonId }, select: { status: true, timezone: true } });
    if (!salon || salon.status !== "ACTIVE") throw new NotFoundException("Salon not found");
    return forCustomer(await this.book(customerId, dto, salon.timezone, false, customerId));
  }

  /**
   * The salon books a customer (phone or walk-in) with a specific stylist — the owner for any of
   * their stylists, a stylist only for themselves. The customer is found by phone, or gets an
   * account they can later sign in to with an SMS code. Unlike online booking it's confirmed
   * straight away, may start earlier today (recording a walk-in after the fact) and isn't limited
   * to the stylist's working hours — but still can't double-book them.
   */
  async createForSalon(user: JwtPayload, dto: CreateSalonAppointmentDto) {
    const booker = await this.salonBooker(user);
    const customerId = await this.findOrCreateCustomer(dto);
    const stylistId = booker.stylistId ?? dto.stylistId;
    return this.book(customerId, { ...dto, stylistId, salonId: booker.salonId }, booker.timezone, true, user.sub);
  }

  /**
   * Where an independent stylist's booking happens: one of the places they work (the only one by
   * default); a home visit needs the customer's address. Salons have no choice — always null.
   * Online, the customer must pick when there are several; the stylist booking it may leave it open.
   */
  private async bookingPlace(dto: CreateAppointmentDto, bySalon: boolean) {
    const salon = await this.prisma.salon.findUnique({ where: { id: dto.salonId }, select: { kind: true, serviceLocations: true } });
    if (!salon) return { serviceLocation: null, visitAddress: null };
    return resolveBookingPlace(salon, dto.serviceLocation, dto.visitAddress, bySalon);
  }

  /** A customer who has booked at this salon before, looked up by phone (to prefill the name). */
  async lookupSalonCustomer(user: JwtPayload, phone: string) {
    const { salonId } = await this.salonBooker(user);
    const customer = await this.prisma.user.findFirst({
      where: { phone, role: Role.CUSTOMER, appointments: { some: { salonId } } },
      select: { firstName: true, lastName: true },
    });
    return { found: !!customer, ...customer };
  }

  /** The salon the owner or stylist books for; a stylist can only book themselves. */
  private async salonBooker(user: JwtPayload): Promise<{ salonId: string; timezone: string; stylistId?: string }> {
    if (user.role === Role.STYLIST) {
      const stylist = await this.prisma.stylist.findUnique({
        where: { userId: user.sub },
        select: { id: true, active: true, salonId: true, salon: { select: { timezone: true } } },
      });
      if (!stylist) throw new NotFoundException("No stylist profile for this account");
      if (!stylist.active) throw new ForbiddenException("Your stylist account is inactive");
      return { salonId: stylist.salonId, timezone: stylist.salon.timezone, stylistId: stylist.id };
    }
    const salon = await this.prisma.salon.findFirst({ where: { ownerId: user.sub }, select: { id: true, timezone: true } });
    if (!salon) throw new NotFoundException("You don't own a salon yet");
    return { salonId: salon.id, timezone: salon.timezone };
  }

  private async findOrCreateCustomer(dto: CreateSalonAppointmentDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.customerPhone }, select: { id: true, role: true } });
    if (existing) {
      if (existing.role !== Role.CUSTOMER) throw new ConflictException("This phone number belongs to a staff account");
      return existing.id;
    }
    const firstName = dto.customerFirstName?.trim();
    const lastName = dto.customerLastName?.trim() ?? "";
    if (!firstName) throw new BadRequestException("Customer name is required for a new customer");
    const user = await this.prisma.user.create({
      data: {
        phone: dto.customerPhone,
        firstName,
        lastName,
        role: Role.CUSTOMER,
        // Never used: these customers sign in with an SMS code (the OTP login finds them by phone).
        passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
      },
      select: { id: true },
    });
    return user.id;
  }

  private async book(customerId: string, dto: CreateAppointmentDto, timeZone: string, bySalon: boolean, actorUserId: string) {
    const place = await this.bookingPlace(dto, bySalon);

    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.serviceIds }, salonId: dto.salonId, active: true },
    });
    if (services.length !== dto.serviceIds.length) {
      throw new NotFoundException("One or more services were not found for this salon");
    }

    const startAt = new Date(dto.startAt);
    if (bySalon) {
      // Walk-ins can be recorded after the fact, but only for today (salon-local).
      const startOfToday = salonWallTimeToInstant(instantToSalonWallTime(new Date(), timeZone).dateKey, 0, timeZone);
      if (startAt < startOfToday) throw new BadRequestException("This time is in the past");
    } else if (startAt.getTime() <= Date.now()) {
      throw new BadRequestException("This time is in the past");
    }

    const eligible = await findEligibleStylists(this.prisma, dto.salonId, dto.serviceIds);
    const candidates = dto.stylistId ? eligible.filter((s) => s.id === dto.stylistId) : eligible;

    if (candidates.length === 0) {
      throw new NotFoundException(
        dto.stylistId ? "This stylist can't perform all the selected services" : "No stylist can perform all the selected services",
      );
    }

    // Duration/price can differ per stylist (self- or owner-set overrides), so each candidate
    // gets its own end time — the first stylist actually free for their own slot wins. The
    // availability checks and the insert run in one transaction under a per-stylist advisory
    // lock, so two customers can't both grab the same slot between check and insert.
    for (const candidate of candidates) {
      const pricing = effectiveServicePricing(services, candidate.services);
      const { durationMinutes } = sumEffectivePricing(pricing);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

      const appointment = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.id}))`;

        if (!bySalon) {
          const hours = await tx.workingHour.findMany({ where: { stylistId: candidate.id } });
          if (!fitsWorkingHours(hours, startAt, endAt, timeZone)) return null;
        }

        const [timeOff, conflict] = await Promise.all([
          tx.timeOff.findFirst({ where: { stylistId: candidate.id, startAt: { lt: endAt }, endAt: { gt: startAt } } }),
          tx.appointment.findFirst({
            where: { stylistId: candidate.id, status: { in: ACTIVE_STATUSES }, startAt: { lt: endAt }, endAt: { gt: startAt } },
          }),
        ]);
        if (timeOff || conflict) return null;

        return tx.appointment.create({
          data: {
            salonId: dto.salonId,
            stylistId: candidate.id,
            customerId,
            startAt,
            endAt,
            priceToman: pricing.reduce((sum, p) => sum + p.priceToman, 0),
            notes: dto.notes,
            ...place,
            ...(bySalon && { status: AppointmentStatus.CONFIRMED }),
            services: {
              create: pricing.map((p) => ({
                serviceId: p.serviceId,
                priceToman: p.priceToman,
                durationMinutes: p.durationMinutes,
              })),
            },
          },
          include: APPOINTMENT_INCLUDE,
        });
      });

      if (appointment) {
        // Everyone involved hears about it except whoever made it (the customer online; the owner
        // or the stylist themselves when booked by the salon).
        await this.notifyBooking(appointment.id, NotificationType.NEW_BOOKING, { bySalon }, actorUserId);
        // Booked by the salon: the customer didn't do it themselves, so text them — unless it's a
        // walk-in recorded after it started.
        if (bySalon && appointment.startAt > new Date()) void this.smsCustomer(appointment.id, "booked-customer");
        // Booked online: it waits for the stylist. ReminderService texts them to confirm it
        // (within a minute, or after the salon's quiet hours — newBookingTextedAt).
        return appointment;
      }
    }

    throw new BadRequestException("This time slot is no longer available");
  }

  async findMineAsCustomer(customerId: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: { customerId },
      orderBy: { startAt: "desc" },
      include: { ...APPOINTMENT_INCLUDE, stylist: true },
    });
    return appointments.map(forCustomer);
  }

  async findMineAsStylist(userId: string) {
    const stylist = await this.prisma.stylist.findUnique({ where: { userId } });
    if (!stylist) {
      throw new NotFoundException("No stylist profile for this account");
    }

    const rows = await this.prisma.appointment.findMany({
      where: { stylistId: stylist.id },
      orderBy: { startAt: "desc" },
      include: { ...APPOINTMENT_INCLUDE, customer: SAFE_CUSTOMER_SELECT },
    });
    return rows.map(withBookingCustomerName);
  }

  async findMineAsSalonOwner(userId: string) {
    const salon = await this.prisma.salon.findFirst({ where: { ownerId: userId } });
    if (!salon) {
      throw new NotFoundException("You don't own a salon yet");
    }

    const rows = await this.prisma.appointment.findMany({
      where: { salonId: salon.id },
      orderBy: { startAt: "desc" },
      include: { ...APPOINTMENT_INCLUDE, customer: SAFE_CUSTOMER_SELECT, stylist: true },
    });
    return rows.map(withBookingCustomerName);
  }

  async updateStatus(user: JwtPayload, appointmentId: string, status: UpdatableAppointmentStatus) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { services: { select: { serviceId: true, priceToman: true } } },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");

    await this.assertCanSetStatus(user, appointment, status);

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status, ...(await this.accountingFor(appointment, status)) },
    });
    if (status === AppointmentStatus.CANCELLED && appointment.status !== AppointmentStatus.CANCELLED) {
      const cancelledBy = user.role === Role.CUSTOMER ? "CUSTOMER" : user.role === Role.STYLIST ? "STYLIST" : "SALON";
      await this.notifyBooking(appointmentId, NotificationType.BOOKING_CANCELLED, { cancelledBy }, user.sub);
      const upcoming = ACTIVE_STATUSES.includes(appointment.status) && appointment.startAt > new Date();
      // The customer who cancelled knows; otherwise text them.
      if (upcoming && cancelledBy !== "CUSTOMER") void this.smsCustomer(appointmentId, "cancelled-customer");
      // Only an upcoming booking frees a slot someone could still take.
      if (upcoming) await this.waitlist.notifyOpening(appointment);
    } else if (status === AppointmentStatus.CONFIRMED && appointment.status === AppointmentStatus.PENDING) {
      await this.notifyBooking(appointmentId, NotificationType.BOOKING_CONFIRMED, {}, user.sub, "customer");
      if (appointment.startAt > new Date()) void this.smsCustomer(appointmentId, "confirmed-customer");
    }
    return updated;
  }

  /**
   * Staff edit an open (pending/confirmed) appointment: its services, start time and note. Like
   * a salon booking, the time may be earlier today and ignores working hours but can't overlap
   * the stylist's other bookings or time off. Changed services are re-priced at today's rates
   * for this stylist; unchanged ones keep the price they were booked at.
   */
  async updateDetails(user: JwtPayload, appointmentId: string, dto: UpdateAppointmentDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { services: true, salon: { select: { timezone: true, kind: true, serviceLocations: true } } },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");
    await this.assertStaffAccess(user, appointment);
    // Place (independent stylists): re-checked only when either part is sent; null = leave it open.
    const placeChanged = dto.serviceLocation !== undefined || dto.visitAddress !== undefined;
    const place = placeChanged
      ? resolveBookingPlace(
          appointment.salon,
          dto.serviceLocation === undefined ? appointment.serviceLocation : dto.serviceLocation,
          dto.visitAddress === undefined ? appointment.visitAddress : dto.visitAddress,
          true,
        )
      : null;
    if (!ACTIVE_STATUSES.includes(appointment.status)) throw new BadRequestException("This appointment can no longer be edited");

    const currentIds = appointment.services.map((s) => s.serviceId);
    const nextIds = dto.serviceIds ? [...new Set(dto.serviceIds)] : currentIds;
    const servicesChanged = nextIds.length !== currentIds.length || nextIds.some((id) => !currentIds.includes(id));

    let pricing = appointment.services.map((s) => ({ serviceId: s.serviceId, priceToman: s.priceToman, durationMinutes: s.durationMinutes }));
    if (servicesChanged) {
      const [services, stylistServices] = await Promise.all([
        this.prisma.service.findMany({ where: { id: { in: nextIds }, salonId: appointment.salonId, active: true } }),
        this.prisma.stylistService.findMany({ where: { stylistId: appointment.stylistId, serviceId: { in: nextIds } } }),
      ]);
      if (services.length !== nextIds.length) throw new NotFoundException("One or more services were not found for this salon");
      if (stylistServices.length !== nextIds.length) throw new NotFoundException("This stylist can't perform all the selected services");
      const fresh = new Map(effectiveServicePricing(services, stylistServices).map((p) => [p.serviceId, p]));
      // Keep the booked price of services that stay; price only the added ones.
      const kept = new Map(pricing.map((p) => [p.serviceId, p]));
      pricing = nextIds.map((id) => kept.get(id) ?? fresh.get(id)!);
    }

    const timeZone = appointment.salon.timezone;
    const startAt = dto.startAt ? new Date(dto.startAt) : appointment.startAt;
    const endAt = new Date(startAt.getTime() + sumEffectivePricing(pricing).durationMinutes * 60_000);
    const timeChanged = startAt.getTime() !== appointment.startAt.getTime() || endAt.getTime() !== appointment.endAt.getTime();
    if (startAt.getTime() !== appointment.startAt.getTime()) {
      const startOfToday = salonWallTimeToInstant(instantToSalonWallTime(new Date(), timeZone).dateKey, 0, timeZone);
      if (startAt < startOfToday) throw new BadRequestException("This time is in the past");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (timeChanged) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${appointment.stylistId}))`;
        const [timeOff, conflict] = await Promise.all([
          tx.timeOff.findFirst({ where: { stylistId: appointment.stylistId, startAt: { lt: endAt }, endAt: { gt: startAt } } }),
          tx.appointment.findFirst({
            where: {
              id: { not: appointment.id },
              stylistId: appointment.stylistId,
              status: { in: ACTIVE_STATUSES },
              startAt: { lt: endAt },
              endAt: { gt: startAt },
            },
          }),
        ]);
        if (timeOff || conflict) throw new BadRequestException("This time slot is no longer available");
      }
      if (servicesChanged) {
        await tx.appointmentService.deleteMany({ where: { appointmentId: appointment.id } });
        await tx.appointmentService.createMany({ data: pricing.map((p) => ({ appointmentId: appointment.id, ...p })) });
      }
      return tx.appointment.update({
        where: { id: appointment.id },
        data: {
          startAt,
          endAt,
          // a new time gets its own "1 hour before" SMS
          ...(startAt.getTime() !== appointment.startAt.getTime() && {
            reminderSentAt: null,
            reminderLeaseUntil: null,
            customerReminderSentAt: null,
            customerReminderAttempts: 0,
            stylistReminderSentAt: null,
            stylistReminderAttempts: 0,
          }),
          priceToman: pricing.reduce((sum, p) => sum + p.priceToman, 0),
          ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
          ...(dto.customerFirstName !== undefined && { customerFirstName: dto.customerFirstName || null }),
          ...(dto.customerLastName !== undefined && { customerLastName: dto.customerLastName || null }),
          ...place,
        },
        include: APPOINTMENT_INCLUDE,
      });
    });

    if (timeChanged || servicesChanged) {
      const updatedBy = user.role === Role.STYLIST ? "STYLIST" : "SALON";
      await this.notifyBooking(appointment.id, NotificationType.BOOKING_UPDATED, { updatedBy, previousStartAt: appointment.startAt.toISOString() }, user.sub);
      // Moving an upcoming booking frees its old time for whoever is waiting on that day.
      if (startAt.getTime() !== appointment.startAt.getTime() && appointment.startAt > new Date()) await this.waitlist.notifyOpening(appointment);
      if (startAt.getTime() !== appointment.startAt.getTime() && startAt > new Date()) void this.smsCustomer(appointment.id, "rescheduled-customer");
    }
    return updated;
  }

  /**
   * SMS to the customer about a booking staff made, moved or cancelled. Out of the salon plan's
   * monthly SMS allowance like the reminders; best effort and not awaited by callers (a gateway
   * can take seconds) — the booking change already happened.
   */
  private async smsCustomer(appointmentId: string, kind: CustomerSmsKind) {
    try {
      const a = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          salonId: true,
          startAt: true,
          salon: { select: { name: true, timezone: true, kind: true } },
          stylist: { select: { displayName: true, user: { select: { firstName: true, lastName: true } } } },
          customer: { select: { phone: true } },
        },
      });
      if (!a?.customer.phone) return;
      const params = {
        day: jalaliDay(a.startAt, a.salon.timezone),
        time: clock(instantToSalonWallTime(a.startAt, a.salon.timezone).minuteOfDay),
        salon: a.salon.name,
        stylist: a.stylist.displayName,
      };
      // An independent stylist: only their full name, the business being them (sms.text.ts).
      const fullName = `${a.stylist.user.firstName} ${a.stylist.user.lastName}`.trim() || a.stylist.displayName;
      const text =
        a.salon.kind === SalonKind.INDEPENDENT
          ? independentBookingText(kind, { day: params.day, time: params.time, name: fullName })
          : customerBookingText(kind, params);
      if (!(await this.subscriptions.takeReminderSms(a.salonId, new Date(), smsParts(text)))) return;
      await this.sms.send({ kind, to: a.customer.phone, params, text });
    } catch (err) {
      this.logger.warn(`${kind} SMS for ${appointmentId} failed: ${(err as Error).message}`);
    }
  }

  /** Tells the salon owner, the appointment's stylist and the customer — never the person who acted. */
  private async notifyBooking(
    appointmentId: string,
    type: NotificationType,
    extra: Pick<BookingData, "bySalon" | "cancelledBy" | "updatedBy" | "previousStartAt">,
    exceptUserId: string,
    audience: "everyone" | "customer" = "everyone",
  ) {
    try {
      const a = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          startAt: true,
          customerId: true,
          customerFirstName: true,
          customerLastName: true,
          salon: { select: { ownerId: true, name: true } },
          stylist: { select: { userId: true, displayName: true } },
          customer: { select: { firstName: true, lastName: true } },
          services: { select: { service: { select: { name: true } } } },
        },
      });
      if (!a) return;
      await this.notifications.notify(
        audience === "customer" ? [a.customerId] : [a.salon.ownerId, a.stylist.userId, a.customerId],
        type,
        {
          appointmentId,
          salonName: a.salon.name,
          customerName: bookingCustomerFullName(a),
          stylistName: a.stylist.displayName,
          services: a.services.map((s) => s.service.name),
          startAt: a.startAt.toISOString(),
          ...extra,
        },
        exceptUserId,
      );
    } catch {
      // Best effort, like notify() itself — the booking/cancellation already happened.
    }
  }

  /**
   * Completing an appointment books its income: the amount received (its price) split by the
   * stylist's current commission — their default percent, or a service's own rate where the owner
   * set one, weighted by price — frozen so later percent changes don't rewrite history. Moving
   * it out of COMPLETED (a mistaken tap) takes the income (and any tip) back out.
   */
  private async accountingFor(
    appointment: { status: AppointmentStatus; stylistId: string; priceToman: number; services: { serviceId: string; priceToman: number }[] },
    next: AppointmentStatus,
  ) {
    if (next === AppointmentStatus.COMPLETED && appointment.status !== AppointmentStatus.COMPLETED) {
      const stylist = await this.prisma.stylist.findUnique({
        where: { id: appointment.stylistId },
        select: { commissionPercent: true, services: { select: { serviceId: true, commissionPercent: true } } },
      });
      const ownRate = new Map((stylist?.services ?? []).map((s) => [s.serviceId, s.commissionPercent]));
      const commissionPercent = effectiveCommissionPercent(
        appointment.services.map((s) => ({ priceToman: s.priceToman, commissionPercent: ownRate.get(s.serviceId) ?? null })),
        stylist?.commissionPercent ?? 0,
      );
      return {
        chargedToman: appointment.priceToman,
        stylistCommissionPercent: commissionPercent,
        stylistShareToman: splitCharge(appointment.priceToman, commissionPercent).stylistShareToman,
        tipToman: null,
        completedAt: new Date(),
      };
    }
    if (next !== AppointmentStatus.COMPLETED && appointment.status === AppointmentStatus.COMPLETED) {
      return { chargedToman: null, stylistCommissionPercent: null, stylistShareToman: null, tipToman: null, completedAt: null };
    }
    return {};
  }

  private async assertCanSetStatus(
    user: JwtPayload,
    appointment: { customerId: string; stylistId: string; salonId: string; status: string },
    nextStatus: UpdatableAppointmentStatus,
  ) {
    if (user.role === Role.CUSTOMER) {
      if (appointment.customerId !== user.sub) {
        throw new ForbiddenException("Not your appointment");
      }
      if (nextStatus !== "CANCELLED") {
        throw new ForbiddenException("Customers may only cancel their own appointment");
      }
      if (!(ACTIVE_STATUSES as readonly string[]).includes(appointment.status)) {
        throw new BadRequestException("This appointment can no longer be cancelled");
      }
      return;
    }

    return this.assertStaffAccess(user, appointment);
  }

  /** The appointment's own stylist, or the owner of its salon. */
  private async assertStaffAccess(user: JwtPayload, appointment: { stylistId: string; salonId: string }) {
    if (user.role === Role.STYLIST) {
      const stylist = await this.prisma.stylist.findUnique({ where: { userId: user.sub } });
      if (!stylist || stylist.id !== appointment.stylistId) {
        throw new ForbiddenException("Not your appointment");
      }
      return;
    }

    // An independent stylist owns their business, so the owner's check covers them.
    if (user.role === Role.SALON_OWNER || user.role === Role.INDEPENDENT_STYLIST) {
      const salon = await this.prisma.salon.findUnique({ where: { id: appointment.salonId } });
      if (!salon || salon.ownerId !== user.sub) {
        throw new ForbiddenException("Not your salon");
      }
      return;
    }

    throw new ForbiddenException("Not allowed to update this appointment");
  }
}
