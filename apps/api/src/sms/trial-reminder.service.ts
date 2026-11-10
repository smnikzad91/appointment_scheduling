import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SalonKind, SalonStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { instantToSalonWallTime } from "../availability/salon-time.util.js";
import { SmsService } from "./sms.service.js";
import { faDigits, jalaliDayMonth, trialEndingText } from "./sms.text.js";
import { runsBackgroundJobs } from "./job-runner.js";

/** How often the job looks for trials about to end. */
const TICK_MS = 15 * 60_000;
/** Text owners whose trial ends within this many days. */
export const TRIAL_REMINDER_DAYS = 3;
/** Sends only in the daytime, salon-local (Tehran). */
const SEND_FROM_MINUTE = 10 * 60;
const SEND_UNTIL_MINUTE = 21 * 60;
/** Gateway rate limit: notifycloud allows 30 requests/min per key; stay well under it. */
const MAX_SENDS_PER_RUN = 20;
const SEND_SPACING_MS = 2_500;
const DAY_MS = 86_400_000;

/** «فردا» / «۳ روز دیگر»: whole days left, rounded up. */
export function daysLeftText(until: Date, now: Date): string {
  const days = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / DAY_MS));
  return days === 1 ? "فردا" : `${faDigits(days)} روز دیگر`;
}

/**
 * «Your free month ends in 3 days» SMS to the owner of an approved (ACTIVE) salon whose trial
 * (Salon.trialEndsAt) ends within TRIAL_REMINDER_DAYS and who hasn't bought a plan yet — a purchase
 * during the trial moves planExpiresAt past trialEndsAt, and an admin-set plan clears trialEndsAt.
 * Once per salon (Salon.trialReminderSentAt, claimed with a conditional update so several API
 * instances never send it twice). Free for the owner, between SEND_FROM_MINUTE and SEND_UNTIL_MINUTE
 * salon-local. SMS_TRIAL_REMINDERS=off disables it.
 */
@Injectable()
export class TrialReminderService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TrialReminderService.name);
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
    if (this.config.get("SMS_TRIAL_REMINDERS") === "off" || process.env.NODE_ENV === "test" || !runsBackgroundJobs()) return;
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
      const salons = await this.prisma.salon.findMany({
        where: {
          status: SalonStatus.ACTIVE,
          trialReminderSentAt: null,
          planId: { not: null },
          trialEndsAt: { gt: now, lte: new Date(now.getTime() + TRIAL_REMINDER_DAYS * DAY_MS) },
        },
        orderBy: { trialEndsAt: "asc" },
        select: {
          id: true,
          name: true,
          kind: true,
          timezone: true,
          trialEndsAt: true,
          planExpiresAt: true,
          plan: { select: { name: true } },
          owner: { select: { phone: true } },
        },
      });

      for (const s of salons) {
        if (sent >= MAX_SENDS_PER_RUN) break; // the rest go out on the next run
        const trialEndsAt = s.trialEndsAt!;
        const minute = instantToSalonWallTime(now, s.timezone).minuteOfDay;
        if (minute < SEND_FROM_MINUTE || minute >= SEND_UNTIL_MINUTE) continue;
        // Claim first: exactly one instance texts this salon, and a skip below is final.
        const claimed = await this.prisma.salon.updateMany({ where: { id: s.id, trialReminderSentAt: null }, data: { trialReminderSentAt: now } });
        if (claimed.count !== 1) continue;
        const bought = s.planExpiresAt === null || s.planExpiresAt.getTime() > trialEndsAt.getTime();
        if (bought || !s.plan || !s.owner.phone) continue;

        const params = { plan: s.plan.name, until: jalaliDayMonth(trialEndsAt, s.timezone), left: daysLeftText(trialEndsAt, now) };
        if (sent > 0) await this.sleep(SEND_SPACING_MS);
        const text = trialEndingText(params, s.kind === SalonKind.INDEPENDENT);
        if (await this.sms.send({ kind: "trial-ending-owner", to: s.owner.phone, params, text })) sent++;
      }
      if (sent) this.logger.log(`sent ${sent} trial-ending SMS`);
    } catch (error) {
      this.logger.error("trial reminder run failed", error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
    return sent;
  }
}
