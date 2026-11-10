import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppointmentStatus, BalanceMethod } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { instantToSalonWallTime } from "../availability/salon-time.util.js";
import { SmsService } from "./sms.service.js";
import { balanceReminderText, faMoney } from "./sms.text.js";
import { runsBackgroundJobs } from "./job-runner.js";

const TICK_MS = 15 * 60_000;
const DAY_MS = 86_400_000;
/** Remind once, this long after the request if it's still unpaid… */
export const BALANCE_REMINDER_AFTER_DAYS = 3;
/** …but not for requests older than this (stale ones, e.g. from before the reminder existed). */
const MAX_AGE_DAYS = 30;
/** Sends only in the daytime, salon-local. */
const SEND_FROM_MINUTE = 10 * 60;
const SEND_UNTIL_MINUTE = 21 * 60;
/** Gateway rate limit: notifycloud allows 30 requests/min per key; stay well under it. */
const MAX_SENDS_PER_RUN = 20;
const SEND_SPACING_MS = 2_500;

/**
 * «یادآوری: باقی‌مانده نوبت … … تومان؛ در پنل بپردازید» — one SMS to a customer whose
 * wallet balance request (balanceMethod WALLET, wallet/balance.ts) is still unpaid
 * BALANCE_REMINDER_AFTER_DAYS after it was made (Appointment.balanceRequestedAt). Once per booking
 * (balanceReminderSentAt, claimed with a conditional update first), 10:00–21:00 salon-local,
 * charged to the booking's stylist like the request itself. SMS_BALANCE_REMINDERS=off disables it.
 */
@Injectable()
export class BalanceReminderService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BalanceReminderService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  /** Replaceable in tests so they don't wait between sends. */
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get("SMS_BALANCE_REMINDERS") === "off" || process.env.NODE_ENV === "test" || !runsBackgroundJobs()) return;
    this.timer = setInterval(() => void this.run(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass; returns how many texts were sent. */
  async run(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let sent = 0;
    try {
      const due = await this.prisma.appointment.findMany({
        where: {
          status: AppointmentStatus.COMPLETED,
          balanceMethod: BalanceMethod.WALLET,
          balancePaidAt: null,
          balanceDueToman: { gt: 0 },
          balanceReminderSentAt: null,
          balanceRequestedAt: { lte: new Date(now.getTime() - BALANCE_REMINDER_AFTER_DAYS * DAY_MS), gt: new Date(now.getTime() - MAX_AGE_DAYS * DAY_MS) },
        },
        orderBy: { balanceRequestedAt: "asc" },
        take: 100,
        select: {
          id: true,
          balanceDueToman: true,
          salon: { select: { name: true, timezone: true } },
          stylist: { select: { userId: true } },
          customer: { select: { phone: true } },
        },
      });
      for (const a of due) {
        if (sent >= MAX_SENDS_PER_RUN) break; // the rest go out on the next run
        const minute = instantToSalonWallTime(now, a.salon.timezone).minuteOfDay;
        if (minute < SEND_FROM_MINUTE || minute >= SEND_UNTIL_MINUTE) continue;
        // Claim first: exactly one instance texts this booking, and a skip below is final.
        const claimed = await this.prisma.appointment.updateMany({ where: { id: a.id, balanceReminderSentAt: null, balancePaidAt: null }, data: { balanceReminderSentAt: now } });
        if (claimed.count !== 1 || !a.customer.phone) continue;
        const params = { amount: faMoney(a.balanceDueToman), salon: a.salon.name };
        if (sent > 0) await this.sleep(SEND_SPACING_MS);
        const ok = await this.sms.send(
          { kind: "balance-reminder-customer", to: a.customer.phone, params, text: balanceReminderText(params) },
          { userId: a.stylist.userId, appointmentId: a.id, note: "یادآوری باقی‌مانده به مشتری" },
        );
        if (ok) sent++;
      }
      if (sent) this.logger.log(`sent ${sent} balance reminder SMS`);
    } catch (error) {
      this.logger.error("balance reminder run failed", error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
    return sent;
  }
}
