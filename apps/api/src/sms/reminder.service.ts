import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppointmentStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { instantToSalonWallTime } from "../availability/salon-time.util.js";
import { SmsService } from "./sms.service.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";
import { clock, customerReminderText, jalaliDay, smsParts, stylistConfirmNudgeText, stylistNewBookingText, stylistReminderText } from "./sms.text.js";
import { maySendNow, parseQuietHours, type QuietWindow } from "./quiet-hours.util.js";

const TICK_MS = 60_000;
const LEAD_MINUTES = 60;
/**
 * A reminder that couldn't go out on time (the API was down through its window, or the send
 * failed) is still sent late, as long as the booking is at least this far ahead.
 */
const LATEST_MINUTES = 15;
/** Tries per recipient before giving up; failures go to the admin error log (SmsService). */
const MAX_ATTEMPTS = 3;
/** How long one instance holds a booking while handling it; a crashed holder frees it after this. */
const LEASE_MS = 2 * 60_000;
/** An online booking still PENDING this long after its stylist was first texted gets one nudge. */
const NUDGE_AFTER_MINUTES = 120;

type Recipient = "customer" | "stylist";
const SENT_AT = { customer: "customerReminderSentAt", stylist: "stylistReminderSentAt" } as const;
const ATTEMPTS = { customer: "customerReminderAttempts", stylist: "stylistReminderAttempts" } as const;

/**
 * "1 hour before" SMS to both the customer and the stylist of every open (pending or confirmed)
 * appointment. Every minute it takes unfinished bookings (reminderSentAt null) starting in
 * (now+LATEST_MINUTES, now+LEAD_MINUTES] — so one whose window was missed (downtime, a slow deploy)
 * is still reminded late — and handles each under a short lease (reminderLeaseUntil, a conditional
 * update, so two API instances never work on the same booking).
 *
 * The customer and the stylist are tracked separately (…ReminderSentAt, …ReminderAttempts): a
 * failed send is retried on later ticks, up to MAX_ATTEMPTS, without re-sending the one that
 * already went out. The salon plan's monthly allowance (SubscriptionsService.takeReminderSms) is
 * taken only on a recipient's first attempt, never again for a retry; none left means none sent.
 * The attempt is counted *before* sending, so a crash mid-send can't charge the allowance twice.
 * reminderSentAt is set once both are done (sent or given up). Bookings made less than an hour
 * ahead get none. Rescheduling resets all of it (AppointmentsService.update) so the new time is
 * reminded. SMS_REMINDERS=off disables it.
 *
 * The same tick texts the stylist of each new online (PENDING) booking to confirm it
 * (newBookingTextedAt), and nudges them once if it's still PENDING NUDGE_AFTER_MINUTES after that
 * (confirmNudgedAt). Both wait out the salon's quiet hours (SMS_QUIET_HOURS, default 22:00–08:00
 * salon time, quiet-hours.util.ts) unless the booking starts before they end; a booking confirmed,
 * cancelled or started meanwhile no longer matches, so its text is simply dropped. Each is claimed
 * by a conditional update *before* the allowance is taken and the SMS sent: never sent twice,
 * never charged twice (a send that fails after the claim is not retried).
 */
type DueAppointment = {
  id: string;
  salonId: string;
  startAt: Date;
  createdAt: Date;
  customerReminderSentAt: Date | null;
  customerReminderAttempts: number;
  stylistReminderSentAt: Date | null;
  stylistReminderAttempts: number;
  salon: { name: string; timezone: string };
  stylist: { displayName: string; user: { phone: string | null } };
  customer: { firstName: string; lastName: string; phone: string | null };
  services: { service: { name: string } }[];
};

@Injectable()
export class ReminderService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReminderService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly quiet: QuietWindow;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
    private readonly subscriptions: SubscriptionsService,
  ) {
    this.quiet = parseQuietHours(this.config.get<string>("SMS_QUIET_HOURS"));
  }

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
      const due = await this.prisma.appointment.findMany({
        where: {
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
          reminderSentAt: null,
          startAt: { gt: new Date(now.getTime() + LATEST_MINUTES * 60_000), lte: new Date(now.getTime() + LEAD_MINUTES * 60_000) },
          OR: [{ reminderLeaseUntil: null }, { reminderLeaseUntil: { lt: now } }],
        },
        include: {
          salon: { select: { name: true, timezone: true } },
          stylist: { select: { displayName: true, user: { select: { phone: true } } } },
          customer: { select: { firstName: true, lastName: true, phone: true } },
          services: { select: { service: { select: { name: true } } } },
        },
      });
      for (const a of due) sent += await this.remind(a, now);
      sent += await this.textNewBookings(now);
      sent += await this.nudgeUnconfirmed(now);
      if (sent) this.logger.log(`sent ${sent} reminder SMS`);
    } catch (error) {
      this.logger.error("reminder tick failed", error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
    return sent;
  }

  private async remind(a: DueAppointment, now: Date): Promise<number> {
    // Take the lease; another instance holding it (or having just finished) makes this a no-op.
    const leased = await this.prisma.appointment.updateMany({
      where: { id: a.id, reminderSentAt: null, OR: [{ reminderLeaseUntil: null }, { reminderLeaseUntil: { lt: now } }] },
      data: { reminderLeaseUntil: new Date(now.getTime() + LEASE_MS) },
    });
    if (leased.count !== 1) return 0;

    if (a.startAt.getTime() - a.createdAt.getTime() < LEAD_MINUTES * 60_000) {
      // booked within the hour: no reminder
      await this.prisma.appointment.update({ where: { id: a.id }, data: { reminderSentAt: now, reminderLeaseUntil: null } });
      return 0;
    }

    const time = clock(instantToSalonWallTime(a.startAt, a.salon.timezone).minuteOfDay);
    const customerParams = { time, salon: a.salon.name, stylist: a.stylist.displayName };
    const stylistParams = {
      time,
      customer: `${a.customer.firstName} ${a.customer.lastName}`.trim(),
      services: a.services.map((s) => s.service.name).join("، "),
    };
    const messages = {
      customer: a.customer.phone && { kind: "reminder-customer" as const, to: a.customer.phone, params: customerParams, text: customerReminderText(customerParams) },
      stylist: a.stylist.user.phone && { kind: "reminder-stylist" as const, to: a.stylist.user.phone, params: stylistParams, text: stylistReminderText(stylistParams) },
    };

    let sent = 0;
    const done = { customer: false, stylist: false };
    for (const who of ["customer", "stylist"] as Recipient[]) {
      const attempts = a[ATTEMPTS[who]];
      const message = messages[who];
      if (a[SENT_AT[who]] || attempts >= MAX_ATTEMPTS || !message) {
        done[who] = true;
        continue;
      }
      // Count the try first: the allowance is charged only when this is the very first one.
      await this.prisma.appointment.update({ where: { id: a.id }, data: { [ATTEMPTS[who]]: { increment: 1 } } });
      if (attempts === 0 && !(await this.subscriptions.takeReminderSms(a.salonId, now, smsParts(message.text)))) {
        await this.prisma.appointment.update({ where: { id: a.id }, data: { [ATTEMPTS[who]]: MAX_ATTEMPTS } }); // none left: give up
        done[who] = true;
        continue;
      }
      if (await this.sms.send(message)) {
        await this.prisma.appointment.update({ where: { id: a.id }, data: { [SENT_AT[who]]: now } });
        done[who] = true;
        sent++;
      } else if (attempts + 1 >= MAX_ATTEMPTS) {
        done[who] = true; // the failures are in the admin error log
      }
    }

    await this.prisma.appointment.update({
      where: { id: a.id },
      data: { reminderLeaseUntil: null, ...(done.customer && done.stylist && { reminderSentAt: now }) },
    });
    return sent;
  }

  /** "New booking, please confirm" to the stylist of each online booking not yet texted. */
  private async textNewBookings(now: Date): Promise<number> {
    const due = await this.prisma.appointment.findMany({
      where: { status: AppointmentStatus.PENDING, newBookingTextedAt: null, startAt: { gt: now } },
      include: {
        salon: { select: { timezone: true } },
        stylist: { select: { user: { select: { phone: true } } } },
        customer: { select: { firstName: true, lastName: true } },
      },
    });
    let sent = 0;
    for (const a of due) {
      if (!maySendNow(now, a.salon.timezone, a.startAt, this.quiet)) continue; // after quiet hours
      const claimed = await this.prisma.appointment.updateMany({ where: { id: a.id, newBookingTextedAt: null }, data: { newBookingTextedAt: now } });
      if (claimed.count !== 1 || !a.stylist.user.phone) continue;
      const params = {
        day: jalaliDay(a.startAt, a.salon.timezone),
        time: clock(instantToSalonWallTime(a.startAt, a.salon.timezone).minuteOfDay),
        customer: `${a.customer.firstName} ${a.customer.lastName}`.trim(),
      };
      const text = stylistNewBookingText(params);
      if (!(await this.subscriptions.takeReminderSms(a.salonId, now, smsParts(text)))) continue;
      if (await this.sms.send({ kind: "new-booking-stylist", to: a.stylist.user.phone, params, text })) sent++;
    }
    return sent;
  }

  private async nudgeUnconfirmed(now: Date): Promise<number> {
    const due = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.PENDING,
        confirmNudgedAt: null,
        newBookingTextedAt: { lte: new Date(now.getTime() - NUDGE_AFTER_MINUTES * 60_000) },
        startAt: { gt: now },
      },
      include: {
        salon: { select: { timezone: true } },
        stylist: { select: { user: { select: { phone: true } } } },
        customer: { select: { firstName: true, lastName: true } },
      },
    });
    let sent = 0;
    for (const a of due) {
      if (!maySendNow(now, a.salon.timezone, a.startAt, this.quiet)) continue; // after quiet hours
      const claimed = await this.prisma.appointment.updateMany({ where: { id: a.id, confirmNudgedAt: null }, data: { confirmNudgedAt: now } });
      if (claimed.count !== 1 || !a.stylist.user.phone) continue;
      const params = {
        day: jalaliDay(a.startAt, a.salon.timezone),
        time: clock(instantToSalonWallTime(a.startAt, a.salon.timezone).minuteOfDay),
        customer: `${a.customer.firstName} ${a.customer.lastName}`.trim(),
      };
      const text = stylistConfirmNudgeText(params);
      if (!(await this.subscriptions.takeReminderSms(a.salonId, now, smsParts(text)))) continue;
      if (await this.sms.send({ kind: "confirm-nudge-stylist", to: a.stylist.user.phone, params, text })) sent++;
    }
    return sent;
  }
}
