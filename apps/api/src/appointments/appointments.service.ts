import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { AppointmentStatus, NotificationType, Role } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { JwtPayload } from "../auth/auth.service.js";
import { findEligibleStylists } from "../salons/eligible-stylists.util.js";
import { effectiveServicePricing, sumEffectivePricing } from "../salons/service-pricing.util.js";
import { CreateAppointmentDto, CreateSalonAppointmentDto, CreateStylistAppointmentDto } from "./dto/create-appointment.dto.js";
import { instantToSalonWallTime, salonWallTimeToInstant } from "../availability/salon-time.util.js";
import { UpdatableAppointmentStatus } from "./dto/update-status.dto.js";
import { fitsWorkingHours } from "./working-hours.util.js";
import { effectiveCommissionPercent, splitCharge } from "../accounting/share.util.js";
import { NotificationsService, type BookingData } from "../notifications/notifications.service.js";
import { WaitlistService } from "../waitlist/waitlist.service.js";
import { NotifycloudService } from "../sms/notifycloud.service.js";
import { appointmentSmsText, type AppointmentSmsKind } from "./appointment-sms.util.js";

const ACTIVE_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

const APPOINTMENT_INCLUDE = {
  salon: true,
  services: { include: { service: true } },
  reviews: { select: { id: true, target: true, rating: true, comment: true, status: true } },
} as const;

// Never `customer: true` / `user: true` on a relation to the User model — that returns every
// column including passwordHash. Always select only what the viewer (stylist/owner) needs to see.
const SAFE_CUSTOMER_SELECT = { select: { id: true, firstName: true, lastName: true, phone: true, avatarUrl: true } } as const;

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly waitlist: WaitlistService,
    private readonly sms: NotifycloudService,
  ) {}

  async create(customerId: string, dto: CreateAppointmentDto) {
    const salon = await this.prisma.salon.findUnique({ where: { id: dto.salonId }, select: { status: true, timezone: true } });
    if (!salon || salon.status !== "ACTIVE") throw new NotFoundException("Salon not found");
    return this.book(customerId, dto, salon.timezone, null);
  }

  /**
   * The salon books a customer (phone or walk-in) with a specific stylist. The customer is found
   * by phone, or gets an account they can later sign in to with an SMS code. Unlike online
   * booking it's confirmed straight away, may start earlier today (recording a walk-in after the
   * fact) and isn't limited to the stylist's working hours — but still can't double-book them.
   */
  async createForSalon(ownerUserId: string, dto: CreateSalonAppointmentDto) {
    const salon = await this.prisma.salon.findFirst({ where: { ownerId: ownerUserId }, select: { id: true, timezone: true } });
    if (!salon) throw new NotFoundException("You don't own a salon yet");
    const customerId = await this.findOrCreateCustomer(dto);
    return this.book(customerId, { ...dto, salonId: salon.id }, salon.timezone, ownerUserId);
  }

  /** A stylist books a customer with themselves — same rules as a booking by the salon. */
  async createForStylist(stylistUserId: string, dto: CreateStylistAppointmentDto) {
    const stylist = await this.prisma.stylist.findUnique({
      where: { userId: stylistUserId },
      select: { id: true, active: true, salonId: true, salon: { select: { timezone: true } } },
    });
    if (!stylist || !stylist.active) throw new NotFoundException("No active stylist profile for this account");
    const customerId = await this.findOrCreateCustomer(dto);
    return this.book(
      customerId,
      { ...dto, salonId: stylist.salonId, stylistId: stylist.id },
      stylist.salon.timezone,
      stylistUserId,
    );
  }

  /** A customer who has booked at this salon before, looked up by phone (to prefill the name).
   * Open to the salon's owner and its stylists. */
  async lookupSalonCustomer(user: JwtPayload, phone: string) {
    const salonId =
      user.role === Role.STYLIST
        ? (await this.prisma.stylist.findUnique({ where: { userId: user.sub }, select: { salonId: true } }))?.salonId
        : (await this.prisma.salon.findFirst({ where: { ownerId: user.sub }, select: { id: true } }))?.id;
    if (!salonId) throw new NotFoundException("No salon for this account");
    const customer = await this.prisma.user.findFirst({
      where: { phone, role: Role.CUSTOMER, appointments: { some: { salonId } } },
      select: { firstName: true, lastName: true },
    });
    return { found: !!customer, ...customer };
  }

  private async findOrCreateCustomer(dto: CreateStylistAppointmentDto) {
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

  /** `bookedBy`: the owner or stylist booking on the customer's behalf; null for an online booking. */
  private async book(customerId: string, dto: CreateAppointmentDto, timeZone: string, bookedBy: string | null) {
    const bySalon = bookedBy !== null;

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
        // Everyone involved hears about it except whoever made it: online, the owner and the
        // stylist; by the salon or a stylist, the other of those two and the customer.
        await this.notifyBooking(appointment.id, NotificationType.NEW_BOOKING, { bySalon }, bookedBy ?? customerId);
        // The customer didn't make this booking themselves, so tell them by SMS too — unless
        // it's a walk-in recorded after the fact. Not awaited: the gateway can take seconds.
        if (bySalon && appointment.startAt.getTime() > Date.now()) void this.smsCustomer(appointment.id, "booked");
        return appointment;
      }
    }

    throw new BadRequestException("This time slot is no longer available");
  }

  findMineAsCustomer(customerId: string) {
    return this.prisma.appointment.findMany({
      where: { customerId },
      orderBy: { startAt: "desc" },
      include: { ...APPOINTMENT_INCLUDE, stylist: true },
    });
  }

  async findMineAsStylist(userId: string) {
    const stylist = await this.prisma.stylist.findUnique({ where: { userId } });
    if (!stylist) {
      throw new NotFoundException("No stylist profile for this account");
    }

    return this.prisma.appointment.findMany({
      where: { stylistId: stylist.id },
      orderBy: { startAt: "desc" },
      include: { ...APPOINTMENT_INCLUDE, customer: SAFE_CUSTOMER_SELECT },
    });
  }

  async findMineAsSalonOwner(userId: string) {
    const salon = await this.prisma.salon.findFirst({ where: { ownerId: userId } });
    if (!salon) {
      throw new NotFoundException("You don't own a salon yet");
    }

    return this.prisma.appointment.findMany({
      where: { salonId: salon.id },
      orderBy: { startAt: "desc" },
      include: { ...APPOINTMENT_INCLUDE, customer: SAFE_CUSTOMER_SELECT, stylist: true },
    });
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
      // The customer cancelled it themselves, so they already know; otherwise text them.
      if (upcoming && cancelledBy !== "CUSTOMER") void this.smsCustomer(appointmentId, "cancelled");
      // Only an upcoming booking frees a slot someone could still take.
      if (upcoming) await this.waitlist.notifyOpening(appointment);
    } else if (status === AppointmentStatus.CONFIRMED && appointment.status === AppointmentStatus.PENDING) {
      await this.notifyBooking(appointmentId, NotificationType.BOOKING_CONFIRMED, {}, user.sub, "customer");
    }
    return updated;
  }

  /** Best effort, like the in-app notifications — the booking change already happened. Not
   * awaited by callers: the gateway can take seconds. */
  private async smsCustomer(appointmentId: string, kind: AppointmentSmsKind) {
    if (!this.sms.enabled) return;
    try {
      const a = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          startAt: true,
          salon: { select: { name: true, timezone: true } },
          stylist: { select: { displayName: true } },
          customer: { select: { phone: true } },
        },
      });
      if (!a?.customer.phone) return;
      const text = appointmentSmsText(kind, {
        salonName: a.salon.name,
        stylistName: a.stylist.displayName,
        startAt: a.startAt,
        timeZone: a.salon.timezone,
      });
      await this.sms.sendSms(a.customer.phone, text, `${appointmentId}:${kind}`);
    } catch (err) {
      this.logger.warn(`${kind} SMS for ${appointmentId} failed: ${(err as Error).message}`);
    }
  }

  /** Tells the salon owner, the appointment's stylist and the customer — never the person who acted. */
  private async notifyBooking(
    appointmentId: string,
    type: NotificationType,
    extra: Pick<BookingData, "bySalon" | "cancelledBy">,
    exceptUserId: string,
    audience: "everyone" | "customer" = "everyone",
  ) {
    try {
      const a = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          startAt: true,
          customerId: true,
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
          customerName: `${a.customer.firstName} ${a.customer.lastName}`.trim(),
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

    if (user.role === Role.STYLIST) {
      const stylist = await this.prisma.stylist.findUnique({ where: { userId: user.sub } });
      if (!stylist || stylist.id !== appointment.stylistId) {
        throw new ForbiddenException("Not your appointment");
      }
      return;
    }

    if (user.role === Role.SALON_OWNER) {
      const salon = await this.prisma.salon.findUnique({ where: { id: appointment.salonId } });
      if (!salon || salon.ownerId !== user.sub) {
        throw new ForbiddenException("Not your salon");
      }
      return;
    }

    throw new ForbiddenException("Not allowed to update this appointment");
  }
}
