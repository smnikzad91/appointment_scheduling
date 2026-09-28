import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppointmentStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { instantToSalonWallTime } from "../availability/salon-time.util.js";
import { SmsService } from "./sms.service.js";
import { clock, customerReminderText, stylistReminderText } from "./sms.text.js";

const TICK_MS = 60_000;
const LEAD_MINUTES = 60;
/** How late a reminder may still go out (e.g. after a restart) — past that it's skipped. */
const GRACE_MINUTES = 10;

/**
 * "1 hour before" SMS to both the customer and the stylist of every open (pending or confirmed)
 * appointment. Every minute it takes bookings starting in (now+50, now+60] minutes that haven't
 * been reminded, claims each with a conditional update (so two API instances never both send),
 * then sends. Bookings made less than an hour ahead get none. Rescheduling clears
 * reminderSentAt (AppointmentsService.update) so the new time is reminded. SMS_REMINDERS=off
 * disables it.
 */
@Injectable()
export class ReminderService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReminderService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get("SMS_REMINDERS") === "off" || process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(now = new Date()): Promise<number> {
    if (this.running) return 0; // a slow tick never overlaps the next
    this.running = true;
    let sent = 0;
    try {
      const from = new Date(now.getTime() + (LEAD_MINUTES - GRACE_MINUTES) * 60_000);
      const to = new Date(now.getTime() + LEAD_MINUTES * 60_000);
      const due = await this.prisma.appointment.findMany({
        where: {
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
          reminderSentAt: null,
          startAt: { gt: from, lte: to },
        },
        include: {
          salon: { select: { name: true, timezone: true } },
          stylist: { select: { displayName: true, user: { select: { phone: true } } } },
          customer: { select: { firstName: true, lastName: true, phone: true } },
          services: { select: { service: { select: { name: true } } } },
        },
      });

      for (const a of due) {
        // claim first: exactly one instance wins each booking
        const claimed = await this.prisma.appointment.updateMany({ where: { id: a.id, reminderSentAt: null }, data: { reminderSentAt: now } });
        if (claimed.count !== 1) continue;
        if (a.startAt.getTime() - a.createdAt.getTime() < LEAD_MINUTES * 60_000) continue; // booked within the hour

        const time = clock(instantToSalonWallTime(a.startAt, a.salon.timezone).minuteOfDay);
        if (a.customer.phone) {
          const params = { time, salon: a.salon.name, stylist: a.stylist.displayName };
          if (await this.sms.send({ kind: "reminder-customer", to: a.customer.phone, params, text: customerReminderText(params) })) sent++;
        }
        if (a.stylist.user.phone) {
          const customer = `${a.customer.firstName} ${a.customer.lastName}`.trim();
          const params = { time, customer, services: a.services.map((s) => s.service.name).join("، ") };
          if (await this.sms.send({ kind: "reminder-stylist", to: a.stylist.user.phone, params, text: stylistReminderText(params) })) sent++;
        }
      }
      if (sent) this.logger.log(`sent ${sent} reminder SMS`);
    } catch (error) {
      this.logger.error("reminder tick failed", error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
    return sent;
  }
}
