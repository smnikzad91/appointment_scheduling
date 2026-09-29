import { randomBytes } from "node:crypto";
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppointmentStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { addDaysToDateKey, instantToSalonWallTime } from "../availability/salon-time.util.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";
import { SmsService } from "./sms.service.js";
import { faDigits, rebookText, smsParts } from "./sms.text.js";
import { runsBackgroundJobs } from "./job-runner.js";

/** How often the job looks for due reminders. */
const TICK_MS = 5 * 60_000;
/** Sends start at noon Tehran time (the salon's timezone) and stop before quiet hours. */
const SEND_FROM_MINUTE = 12 * 60;
const SEND_UNTIL_MINUTE = 22 * 60;
/** Tries per appointment before giving up; failures go to the admin error log (SmsService). */
const MAX_ATTEMPTS = 3;
/** Gateway rate limit: notifycloud allows 30 requests/min per key; stay well under it. */
const MAX_SENDS_PER_RUN = 20;
const SEND_SPACING_MS = 2_500;
/** No setting can be more than this, so older appointments are never looked at. */
const MAX_REBOOK_DAYS = 365;

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/l/I
/** 8 random chars (~46 bits): the /r/<code> link in the SMS, unguessable and short. */
export function newRebookCode(): string {
  return [...randomBytes(8)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

type Candidate = {
  id: string;
  salonId: string;
  customerId: string;
  startAt: Date;
  rebookReminderAttempts: number;
  rebookCode: string | null;
  salon: { name: string; slug: string; timezone: string };
  stylist: {
    displayName: string;
    services: { serviceId: string; overrideRebookReminderEnabled: boolean | null; overrideRebookReminderDays: number | null }[];
  };
  customer: { firstName: string; phone: string | null };
  services: { service: { id: string; name: string; rebookReminderEnabled: boolean; rebookReminderDays: number } }[];
};

/**
 * "Time to book again" SMS: some days after a COMPLETED appointment, text the customer a link to
 * book the same salon. Per service: `rebookReminderEnabled` / `rebookReminderDays` (salon), which the
 * appointment's stylist may override for their customers (StylistService.overrideRebookReminder…).
 * With several services the one due soonest counts; each appointment gets at most one text.
 *
 * Daily at noon Tehran time: every TICK_MS it looks for appointments whose (salon-local) date +
 * days is today, between SEND_FROM_MINUTE and SEND_UNTIL_MINUTE — a run missed at noon (restart,
 * downtime) happens later the same day. Skipped (marked done, no SMS): the day has passed, the
 * customer already booked again at the salon, no phone, or the plan's SMS allowance is used up.
 *
 * Each appointment is claimed with a conditional update (rebookReminderSentAt + attempts) before
 * sending, so several API instances never send it twice. The allowance is taken only on the first
 * try; a failed send is released and retried on later runs that day, up to MAX_ATTEMPTS. At most
 * MAX_SENDS_PER_RUN texts per run, SEND_SPACING_MS apart, to respect the gateway's rate limit —
 * the rest go out on the next run. SMS_REBOOK_REMINDERS=off disables it.
 *
 * It's promotional, so customers can stop it: the text's link (/r/<rebookCode>, apps/web) offers
 * "book again" and "stop these texts", and the customer dashboard has the same switch
 * (User.promoSmsOptOut). Opted-out customers are skipped. The allowance is charged by SMS parts.
 */
@Injectable()
export class RebookReminderService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RebookReminderService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly siteUrl: string;
  /** Replaceable in tests so they don't wait between sends. */
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
    private readonly subscriptions: SubscriptionsService,
  ) {
    const explicit = config.get<string>("SITE_URL")?.trim();
    const domain = config.get<string>("SMS_OTP_DOMAIN")?.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    this.siteUrl = (explicit || (domain ? `https://${domain}` : "https://dev-iot.ir")).replace(/\/+$/, "");
  }

  onApplicationBootstrap() {
    if (this.config.get("SMS_REBOOK_REMINDERS") === "off" || process.env.NODE_ENV === "test" || !runsBackgroundJobs()) return;
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
      const candidates: Candidate[] = await this.prisma.appointment.findMany({
        where: {
          status: AppointmentStatus.COMPLETED,
          rebookReminderSentAt: null,
          rebookReminderAttempts: { lt: MAX_ATTEMPTS },
          customer: { promoSmsOptOut: false },
          startAt: { gte: new Date(now.getTime() - (MAX_REBOOK_DAYS + 2) * 86_400_000), lt: now },
          OR: [
            { services: { some: { service: { rebookReminderEnabled: true } } } },
            { stylist: { services: { some: { overrideRebookReminderEnabled: true } } } },
          ],
        },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          salonId: true,
          customerId: true,
          startAt: true,
          rebookReminderAttempts: true,
          rebookCode: true,
          salon: { select: { name: true, slug: true, timezone: true } },
          stylist: {
            select: {
              displayName: true,
              services: { select: { serviceId: true, overrideRebookReminderEnabled: true, overrideRebookReminderDays: true } },
            },
          },
          customer: { select: { firstName: true, phone: true } },
          services: { select: { service: { select: { id: true, name: true, rebookReminderEnabled: true, rebookReminderDays: true } } } },
        },
      });

      for (const a of candidates) {
        if (sent >= MAX_SENDS_PER_RUN) break; // the rest go out on the next run
        const due = this.dueService(a);
        if (!due) continue; // enabled only on a stylist this appointment isn't with
        const today = instantToSalonWallTime(now, a.salon.timezone);
        const dueKey = addDaysToDateKey(instantToSalonWallTime(a.startAt, a.salon.timezone).dateKey, due.days);
        if (dueKey > today.dateKey) continue; // not yet
        if (dueKey < today.dateKey) {
          await this.finish(a.id); // its day has passed (e.g. the setting was just turned on)
          continue;
        }
        if (today.minuteOfDay < SEND_FROM_MINUTE || today.minuteOfDay >= SEND_UNTIL_MINUTE) continue;
        if (sent > 0) await this.sleep(SEND_SPACING_MS);
        if (await this.remind(a, due, now)) sent++;
      }
      if (sent) this.logger.log(`sent ${sent} rebook reminder SMS`);
    } catch (error) {
      this.logger.error("rebook reminder run failed", error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
    return sent;
  }

  /** The enabled service with the shortest interval, after this stylist's overrides. */
  private dueService(a: Candidate): { name: string; days: number } | null {
    const overrides = new Map(a.stylist.services.map((s) => [s.serviceId, s]));
    let best: { name: string; days: number } | null = null;
    for (const { service } of a.services) {
      const o = overrides.get(service.id);
      if (!(o?.overrideRebookReminderEnabled ?? service.rebookReminderEnabled)) continue;
      const days = o?.overrideRebookReminderDays ?? service.rebookReminderDays;
      if (!best || days < best.days) best = { name: service.name, days };
    }
    return best;
  }

  private finish(id: string) {
    return this.prisma.appointment.update({ where: { id }, data: { rebookReminderSentAt: new Date() } });
  }

  private async remind(a: Candidate, due: { name: string; days: number }, now: Date): Promise<boolean> {
    // Claim: exactly one instance wins this appointment (and this attempt number). A retry keeps
    // the code it already has, so a link from an earlier try still works.
    const code = a.rebookCode ?? newRebookCode();
    const claimed = await this.prisma.appointment.updateMany({
      where: { id: a.id, rebookReminderSentAt: null, rebookReminderAttempts: a.rebookReminderAttempts },
      data: { rebookReminderSentAt: now, rebookReminderAttempts: { increment: 1 }, rebookCode: code },
    });
    if (claimed.count !== 1) return false;

    // Already coming back (or came back): no need to remind. The claim stays as "done".
    const rebooked = await this.prisma.appointment.findFirst({
      where: {
        customerId: a.customerId,
        salonId: a.salonId,
        startAt: { gt: a.startAt },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
      },
      select: { id: true },
    });
    if (rebooked || !a.customer.phone) return false;

    const params = {
      customer: a.customer.firstName || "مشتری",
      days: faDigits(due.days),
      service: due.name,
      salon: a.salon.name,
      link: `${this.siteUrl}/r/${code}`,
    };
    const text = rebookText(params);
    // The allowance is charged once per appointment, on its first try, by SMS parts (this is 2).
    if (a.rebookReminderAttempts === 0 && !(await this.subscriptions.takeReminderSms(a.salonId, now, smsParts(text)))) return false;
    if (await this.sms.send({ kind: "rebook-customer", to: a.customer.phone, params, text })) return true;

    // Failed: release the claim for a retry on a later run, unless that was the last try.
    if (a.rebookReminderAttempts + 1 < MAX_ATTEMPTS) {
      await this.prisma.appointment.update({ where: { id: a.id }, data: { rebookReminderSentAt: null } });
    }
    return false;
  }
}
