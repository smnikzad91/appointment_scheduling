import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, SalonStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { addDaysToDateKey, instantToSalonWallTime } from "../availability/salon-time.util.js";
import { JoinWaitlistDto } from "./dto/join-waitlist.dto.js";

/** How far ahead a customer can wait for a day. */
const MAX_DAYS_AHEAD = 60;

/** Payload of SLOT_OPENED. */
export interface SlotOpenedData {
  salonName: string;
  salonSlug: string;
  dateKey: string;
  stylistId: string | null;
  stylistName: string | null;
  serviceIds: string[];
}

/**
 * "Tell me if a time opens up" for a fully booked day. One entry per customer, salon and day
 * (joining again updates it). When an active appointment on that day is cancelled, everyone
 * waiting for that salon and day — for any stylist, or for that stylist — is notified once.
 */
@Injectable()
export class WaitlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async join(customerId: string, slug: string, dto: JoinWaitlistDto) {
    const salon = await this.prisma.salon.findFirst({ where: { slug, status: SalonStatus.ACTIVE }, select: { id: true, timezone: true } });
    if (!salon) throw new NotFoundException("Salon not found");

    const today = instantToSalonWallTime(new Date(), salon.timezone).dateKey;
    if (dto.date < today || dto.date > addDaysToDateKey(today, MAX_DAYS_AHEAD)) {
      throw new BadRequestException("Choose a day within the next two months");
    }
    const serviceIds = [...new Set(dto.serviceIds)];
    const services = await this.prisma.service.count({ where: { id: { in: serviceIds }, salonId: salon.id, active: true } });
    if (services !== serviceIds.length) throw new NotFoundException("One or more services were not found for this salon");
    if (dto.stylistId) {
      const stylist = await this.prisma.stylist.findFirst({ where: { id: dto.stylistId, salonId: salon.id, active: true }, select: { id: true } });
      if (!stylist) throw new NotFoundException("Stylist not found");
    }

    const data = { stylistId: dto.stylistId ?? null, serviceIds, notifiedAt: null };
    return this.prisma.waitlistEntry.upsert({
      where: { customerId_salonId_dateKey: { customerId, salonId: salon.id, dateKey: dto.date } },
      create: { customerId, salonId: salon.id, dateKey: dto.date, ...data },
      update: data,
    });
  }

  /** The customer's entries for today onwards (in each salon's own time zone). */
  async listMine(customerId: string) {
    const rows = await this.prisma.waitlistEntry.findMany({
      where: { customerId },
      orderBy: { dateKey: "asc" },
      include: {
        salon: { select: { name: true, slug: true, logoUrl: true, timezone: true } },
        stylist: { select: { id: true, displayName: true } },
      },
    });
    const now = new Date();
    return rows
      .filter((r) => r.dateKey >= instantToSalonWallTime(now, r.salon.timezone).dateKey)
      .map((r) => ({
        id: r.id,
        dateKey: r.dateKey,
        serviceIds: r.serviceIds,
        notifiedAt: r.notifiedAt,
        createdAt: r.createdAt,
        salon: { name: r.salon.name, slug: r.salon.slug, logoUrl: r.salon.logoUrl },
        stylist: r.stylist,
      }));
  }

  async leave(customerId: string, id: string) {
    const { count } = await this.prisma.waitlistEntry.deleteMany({ where: { id, customerId } });
    if (count === 0) throw new NotFoundException("Waitlist entry not found");
    return { ok: true };
  }

  /**
   * An active appointment was cancelled: its time is free again. Best effort — never fails the
   * cancellation.
   */
  async notifyOpening(appointment: { salonId: string; stylistId: string; customerId: string; startAt: Date }) {
    try {
      const salon = await this.prisma.salon.findUnique({ where: { id: appointment.salonId }, select: { name: true, slug: true, timezone: true } });
      if (!salon) return;
      const dateKey = instantToSalonWallTime(appointment.startAt, salon.timezone).dateKey;
      const entries = await this.prisma.waitlistEntry.findMany({
        where: {
          salonId: appointment.salonId,
          dateKey,
          notifiedAt: null,
          customerId: { not: appointment.customerId },
          OR: [{ stylistId: null }, { stylistId: appointment.stylistId }],
        },
        include: { stylist: { select: { displayName: true } } },
      });
      for (const e of entries) {
        await this.notifications.notify([e.customerId], NotificationType.SLOT_OPENED, {
          salonName: salon.name,
          salonSlug: salon.slug,
          dateKey,
          stylistId: e.stylistId,
          stylistName: e.stylist?.displayName ?? null,
          serviceIds: e.serviceIds,
        });
      }
      if (entries.length) {
        await this.prisma.waitlistEntry.updateMany({ where: { id: { in: entries.map((e) => e.id) } }, data: { notifiedAt: new Date() } });
      }
    } catch {
      // Best effort.
    }
  }
}
