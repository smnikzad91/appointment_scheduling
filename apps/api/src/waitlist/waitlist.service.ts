import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable, Logger, NotFoundException, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { AppointmentStatus, NotificationType, Prisma, SalonStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { addDaysToDateKey, instantToSalonWallTime } from "../availability/salon-time.util.js";
import { JoinWaitlistDto } from "./dto/join-waitlist.dto.js";
import { runsBackgroundJobs } from "../sms/job-runner.js";

/** How far ahead a customer can wait for a day. */
const MAX_DAYS_AHEAD = 60;
/** A freed time is the first waiting customer's alone for this long (owner's rule, 2026-11-07). */
export const HOLD_MINUTES = 15;
const RELEASE_TICK_MS = 30_000;

type Tx = Prisma.TransactionClient | PrismaService;

/**
 * The hold that keeps [startAt, endAt) of this stylist from everyone but its customer, if any is
 * running. `code` (from the holder's link) or `customerId` = the holder, who isn't blocked.
 */
export function blockingHold(db: Tx, stylistId: string, startAt: Date, endAt: Date, holder: { customerId?: string; code?: string } = {}, now = new Date()) {
  return db.slotHold.findFirst({
    where: {
      stylistId,
      releasedAt: null,
      expiresAt: { gt: now },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(holder.customerId && { customerId: { not: holder.customerId } }),
      ...(holder.code && { code: { not: holder.code } }),
    },
    select: { id: true },
  });
}

/** Payload of SLOT_OPENED. */
export interface SlotOpenedData {
  salonName: string;
  salonSlug: string;
  dateKey: string;
  stylistId: string | null;
  stylistName: string | null;
  serviceIds: string[];
  /** Held for this customer alone (the first in line): the time and until when, and the code for their booking link. */
  hold?: { code: string; startAt: string; until: string; stylistId: string };
}

/**
 * "Tell me if a time opens up" for a fully booked day. One entry per customer, salon and day
 * (joining again updates it). When an active appointment on that day is cancelled, the first in line
 * (oldest entry) for that salon and day — for any stylist, or for that stylist — gets the freed time
 * held for them for HOLD_MINUTES (SlotHold; only they can book it online meanwhile); when the hold
 * runs out and the time is still free, everyone else waiting is notified once.
 */
@Injectable()
export class WaitlistService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WaitlistService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === "test" || !runsBackgroundJobs()) return;
    this.timer = setInterval(() => void this.releaseExpiredHolds().catch((e) => this.logger.error("hold release failed", e instanceof Error ? e.stack : String(e))), RELEASE_TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

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
   * An active appointment was cancelled (or moved): its time is free again. The first in line gets
   * it held for HOLD_MINUTES; if it starts sooner than that, everyone is told at once. Best effort —
   * never fails the cancellation.
   */
  async notifyOpening(appointment: { salonId: string; stylistId: string; customerId: string; startAt: Date; endAt: Date }, now = new Date()) {
    try {
      const salon = await this.prisma.salon.findUnique({ where: { id: appointment.salonId }, select: { name: true, slug: true, timezone: true } });
      if (!salon) return;
      const dateKey = instantToSalonWallTime(appointment.startAt, salon.timezone).dateKey;
      const entries = await this.waiting(appointment.salonId, dateKey, appointment.stylistId, [appointment.customerId]);
      if (!entries.length) return;
      const until = new Date(Math.min(now.getTime() + HOLD_MINUTES * 60_000, appointment.startAt.getTime()));
      if (until.getTime() - now.getTime() < 5 * 60_000) {
        await this.tell(entries, salon, dateKey); // too close to hold it: everyone at once
        return;
      }
      const [first] = entries;
      const hold = await this.prisma.slotHold.create({
        data: {
          code: randomBytes(8).toString("base64url"),
          salonId: appointment.salonId,
          stylistId: appointment.stylistId,
          customerId: first.customerId,
          waitlistEntryId: first.id,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          expiresAt: until,
        },
      });
      await this.tell([first], salon, dateKey, { code: hold.code, startAt: appointment.startAt.toISOString(), until: until.toISOString(), stylistId: appointment.stylistId });
    } catch {
      // Best effort.
    }
  }

  /** Holds that ran out: released, and — if their time is still free — everyone else waiting is told. */
  async releaseExpiredHolds(now = new Date()) {
    const expired = await this.prisma.slotHold.findMany({ where: { releasedAt: null, expiresAt: { lte: now } }, take: 50 });
    for (const h of expired) {
      const claimed = await this.prisma.slotHold.updateMany({ where: { id: h.id, releasedAt: null }, data: { releasedAt: now } });
      if (claimed.count !== 1 || h.startAt <= now) continue;
      const taken = await this.prisma.appointment.findFirst({
        where: { stylistId: h.stylistId, status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }, startAt: { lt: h.endAt }, endAt: { gt: h.startAt } },
        select: { id: true },
      });
      if (taken) continue;
      const salon = await this.prisma.salon.findUnique({ where: { id: h.salonId }, select: { name: true, slug: true, timezone: true } });
      if (!salon) continue;
      const dateKey = instantToSalonWallTime(h.startAt, salon.timezone).dateKey;
      await this.tell(await this.waiting(h.salonId, dateKey, h.stylistId, [h.customerId]), salon, dateKey);
    }
    // old holds are only history
    await this.prisma.slotHold.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } } });
  }

  /** The holder booked (any time overlapping their hold): it's used up. */
  async consumeHolds(customerId: string, stylistId: string, startAt: Date, endAt: Date, now = new Date()) {
    await this.prisma.slotHold.updateMany({
      where: { customerId, stylistId, releasedAt: null, startAt: { lt: endAt }, endAt: { gt: startAt } },
      data: { releasedAt: now },
    });
  }

  /** Not-yet-told entries for that salon and day (any stylist, or this one), oldest first. */
  private waiting(salonId: string, dateKey: string, stylistId: string, exceptCustomers: string[]) {
    return this.prisma.waitlistEntry.findMany({
      where: { salonId, dateKey, notifiedAt: null, customerId: { notIn: exceptCustomers }, OR: [{ stylistId: null }, { stylistId }] },
      orderBy: { createdAt: "asc" },
      include: { stylist: { select: { displayName: true } } },
    });
  }

  private async tell(
    entries: { id: string; customerId: string; stylistId: string | null; serviceIds: string[]; stylist: { displayName: string } | null }[],
    salon: { name: string; slug: string },
    dateKey: string,
    hold?: SlotOpenedData["hold"],
  ) {
    for (const e of entries) {
      const data: SlotOpenedData = {
        salonName: salon.name,
        salonSlug: salon.slug,
        dateKey,
        stylistId: e.stylistId,
        stylistName: e.stylist?.displayName ?? null,
        serviceIds: e.serviceIds,
        ...(hold && { hold }),
      };
      await this.notifications.notify([e.customerId], NotificationType.SLOT_OPENED, data);
    }
    if (entries.length) await this.prisma.waitlistEntry.updateMany({ where: { id: { in: entries.map((e) => e.id) } }, data: { notifiedAt: new Date() } });
  }
}
