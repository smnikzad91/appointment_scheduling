import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AppointmentStatus, Role } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { JwtPayload } from "../auth/auth.service.js";
import { findEligibleStylists } from "../salons/eligible-stylists.util.js";
import { effectiveServicePricing, sumEffectivePricing } from "../salons/service-pricing.util.js";
import { CreateAppointmentDto } from "./dto/create-appointment.dto.js";
import { UpdatableAppointmentStatus } from "./dto/update-status.dto.js";
import { fitsWorkingHours } from "./working-hours.util.js";

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
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateAppointmentDto) {
    const salon = await this.prisma.salon.findUnique({ where: { id: dto.salonId }, select: { status: true, timezone: true } });
    if (!salon || salon.status !== "ACTIVE") throw new NotFoundException("Salon not found");

    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.serviceIds }, salonId: dto.salonId, active: true },
    });
    if (services.length !== dto.serviceIds.length) {
      throw new NotFoundException("One or more services were not found for this salon");
    }

    const startAt = new Date(dto.startAt);
    if (startAt.getTime() <= Date.now()) throw new BadRequestException("This time is in the past");

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

        const hours = await tx.workingHour.findMany({ where: { stylistId: candidate.id } });
        if (!fitsWorkingHours(hours, startAt, endAt, salon.timezone)) return null;

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

      if (appointment) return appointment;
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
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException("Appointment not found");

    await this.assertCanSetStatus(user, appointment, status);

    return this.prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
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
