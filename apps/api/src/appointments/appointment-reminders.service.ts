import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppointmentStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotifycloudService } from "../sms/notifycloud.service.js";
import { instantToSalonWallTime } from "../availability/salon-time.util.js";
import { appointmentSmsText } from "./appointment-sms.util.js";

const TICK_MS = 60_000;
// Per tick, so reminders stay well under notifycloud's 30 requests/min per key (OTPs share it).
const BATCH = 20;
// No reminder texts at night (salon time); due ones go out when the quiet hours end.
const QUIET_FROM_MINUTE = 22 * 60;
const QUIET_UNTIL_MINUTE = 8 * 60;

/**
 * Texts each customer a reminder APPOINTMENT_REMINDER_HOURS (default 3) before an upcoming
 * PENDING/CONFIRMED appointment. Runs every minute in-process; `reminderSentAt` is claimed with a
 * conditional update before sending, so several api instances never double-send. A booking made
 * inside the window gets no reminder (it was just made) and is simply marked handled.
 */
@Injectable()
export class AppointmentRemindersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentRemindersService.name);
  private readonly leadMs: number;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: NotifycloudService,
    config: ConfigService,
  ) {
    const hours = Number(config.get<string>("APPOINTMENT_REMINDER_HOURS", "3"));
    this.leadMs = (Number.isFinite(hours) && hours > 0 ? hours : 3) * 60 * 60_000;
  }

  onModuleInit() {
    if (!this.sms.enabled) return;
    this.timer = setInterval(() => void this.runOnce(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** One pass; returns how many reminders were sent. */
  async runOnce(now = new Date()): Promise<number> {
    if (!this.sms.enabled || this.running) return 0;
    this.running = true;
    try {
      const due = await this.prisma.appointment.findMany({
        where: {
          reminderSentAt: null,
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
          startAt: { gt: now, lte: new Date(now.getTime() + this.leadMs) },
        },
        orderBy: { startAt: "asc" },
        take: BATCH,
        select: {
          id: true,
          startAt: true,
          createdAt: true,
          salon: { select: { name: true, timezone: true } },
          stylist: { select: { displayName: true } },
          customer: { select: { phone: true } },
        },
      });

      let sent = 0;
      for (const a of due) {
        const bookedInsideWindow = a.startAt.getTime() - a.createdAt.getTime() < this.leadMs;
        if (!bookedInsideWindow && isQuietTime(now, a.salon.timezone)) continue;

        const claimed = await this.prisma.appointment.updateMany({
          where: { id: a.id, reminderSentAt: null },
          data: { reminderSentAt: now },
        });
        if (claimed.count === 0 || bookedInsideWindow || !a.customer.phone) continue;

        const text = appointmentSmsText("reminder", {
          salonName: a.salon.name,
          stylistName: a.stylist.displayName,
          startAt: a.startAt,
          timeZone: a.salon.timezone,
        });
        try {
          await this.sms.sendSms(a.customer.phone, text, `${a.id}:reminder`);
          sent++;
        } catch (err) {
          // Not retried — a reminder that goes out late or twice is worse than none.
          this.logger.warn(`Reminder SMS for ${a.id} failed: ${(err as Error).message}`);
        }
      }
      return sent;
    } catch (err) {
      this.logger.error(`Reminder pass failed: ${(err as Error).message}`);
      return 0;
    } finally {
      this.running = false;
    }
  }
}

function isQuietTime(now: Date, timeZone: string): boolean {
  const { minuteOfDay } = instantToSalonWallTime(now, timeZone);
  return minuteOfDay >= QUIET_FROM_MINUTE || minuteOfDay < QUIET_UNTIL_MINUTE;
}
