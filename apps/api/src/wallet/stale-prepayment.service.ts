import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { AppointmentStatus, NotificationType, PrepaymentStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { runsBackgroundJobs } from "../sms/job-runner.js";
import { bookingCustomerFullName } from "../appointments/booking-customer-name.util.js";
import { applyPrepayment } from "./prepayment.js";

const TICK_MS = 15 * 60_000;
/** An online booking nobody confirmed, this long after it was due to end, is cancelled and refunded. */
export const STALE_PENDING_MS = 24 * 60 * 60_000;
const BATCH = 50;

/**
 * Money must not stay held forever on a booking the salon never answered: a PENDING (never
 * confirmed) prepaid booking 24 h past its end is cancelled, its pre-payment goes back to the
 * customer's wallet, and everyone gets BOOKING_CANCELLED with cancelledBy SYSTEM. CONFIRMED ones
 * are left to the salon (marking them done is what pays the owner). Each booking is switched with a
 * conditional update in its own transaction, so a staff tap at the same moment wins cleanly.
 */
@Injectable()
export class StalePrepaymentService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(StalePrepaymentService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === "test" || !runsBackgroundJobs()) return;
    this.timer = setInterval(() => void this.run().catch((e) => this.logger.warn(`run failed: ${(e as Error).message}`)), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass; returns how many bookings were cancelled and refunded. */
  async run(now = new Date()): Promise<number> {
    const stale = await this.prisma.appointment.findMany({
      where: { status: AppointmentStatus.PENDING, prepaymentStatus: PrepaymentStatus.HELD, endAt: { lt: new Date(now.getTime() - STALE_PENDING_MS) } },
      orderBy: { endAt: "asc" },
      take: BATCH,
      select: {
        id: true,
        salonId: true,
        stylistId: true,
        customerId: true,
        prepaidToman: true,
        prepaymentStatus: true,
        prepaymentStylistToman: true,
        startAt: true,
        customerFirstName: true,
        customerLastName: true,
        salon: { select: { ownerId: true, name: true } },
        stylist: { select: { userId: true, displayName: true } },
        customer: { select: { firstName: true, lastName: true } },
        services: { select: { service: { select: { name: true } } } },
      },
    });

    let done = 0;
    for (const a of stale) {
      const cancelled = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.appointment.updateMany({ where: { id: a.id, status: AppointmentStatus.PENDING }, data: { status: AppointmentStatus.CANCELLED } });
        if (claimed.count !== 1) return false; // staff changed it meanwhile
        await applyPrepayment(tx, { ...a, ownerId: a.salon.ownerId, stylistUserId: a.stylist.userId }, AppointmentStatus.CANCELLED);
        return true;
      });
      if (!cancelled) continue;
      done++;
      await this.notifications
        .notify([a.salon.ownerId, a.stylist.userId, a.customerId], NotificationType.BOOKING_CANCELLED, {
          appointmentId: a.id,
          salonName: a.salon.name,
          customerName: bookingCustomerFullName(a),
          stylistName: a.stylist.displayName,
          services: a.services.map((s) => s.service.name),
          startAt: a.startAt.toISOString(),
          cancelledBy: "SYSTEM",
        })
        .catch(() => undefined);
    }
    if (done) this.logger.log(`cancelled and refunded ${done} unconfirmed prepaid booking(s)`);
    return done;
  }
}

