import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ErrorLogService } from "../error-log/error-log.service.js";
import { LogSmsDriver } from "./drivers/log.driver.js";
import { ProviderSmsDriver } from "./drivers/provider.driver.js";
import type { SmsCharge, SmsDriver, SmsMessage } from "./sms.types.js";
import { SmsLogStatus, WalletTxKind } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { moveWallet } from "../wallet/prepayment.js";
import { adminNewAccountText, faMoney, lowBalanceText, smsParts } from "./sms.text.js";

/**
 * Booking SMS are paid from the booking's stylist's wallet, which may go into debt down to this
 * (owner's rule, 2026-10-19): at or below it they aren't sent, and the stylist is texted (free, at
 * most once a day) to top up.
 */
export const SMS_DEBT_LIMIT_TOMAN = -10_000;

/**
 * Sends SMS through the driver chosen by SMS_DRIVER ("log" — the default — or "provider").
 * Failures go to the admin error log; `send` reports success so callers can decide what a
 * failure means (OTP: the request fails; reminders: skipped, the booking is unaffected).
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly driver: SmsDriver;

  /** ADMIN_ALERT_PHONE (apps/api/.env): who gets the «someone signed up» SMS; unset = none. */
  private readonly adminPhone?: string;

  constructor(
    config: ConfigService,
    private readonly errors: ErrorLogService,
    private readonly prisma: PrismaService,
  ) {
    const choice = config.get<string>("SMS_DRIVER") ?? "log";
    this.driver =
      choice === "provider"
        ? new ProviderSmsDriver({
            url: config.get("SMS_API_URL"),
            apiKey: config.get("SMS_API_KEY"),
            sender: config.get("SMS_SENDER"),
            templates: {
              otp: config.get("SMS_TEMPLATE_OTP"),
              "reminder-customer": config.get("SMS_TEMPLATE_REMINDER_CUSTOMER"),
              "reminder-stylist": config.get("SMS_TEMPLATE_REMINDER_STYLIST"),
            },
          })
        : new LogSmsDriver();
    this.logger.log(`SMS driver: ${this.driver.name}`);
    this.adminPhone = config.get<string>("ADMIN_ALERT_PHONE")?.trim() || undefined;
  }

  /**
   * Tells the platform admin a new salon, independent stylist or stylist signed up (ADMIN_ALERT_PHONE).
   * Fire and forget: never throws, never delays or fails the sign-up; the platform's SMS (no charge),
   * sent at any hour.
   */
  notifyAdmin(params: { who: "salon" | "independent" | "stylist"; name: string; place: string }): void {
    const to = this.adminPhone;
    if (!to) return;
    void this.send({ kind: "admin-new-account", to, params, text: adminNewAccountText(params) }).catch(() => {});
  }

  /** True when the driver is a real provider (the log driver doesn't deliver anything). */
  get delivers(): boolean {
    return this.driver.name !== "log";
  }

  /**
   * Sends, and — for a booking SMS (`charge`) — takes what the gateway says it cost from the
   * booking's stylist's wallet («هزینه پیامک»). The wallet may go into debt down to
   * SMS_DEBT_LIMIT_TOMAN (paid off by later income, a top-up, or with the next plan purchase); at
   * or below it the SMS isn't sent (false) and the stylist is asked to top up — unless the charge
   * says `evenInDebt` (a prepaid booking's text to its stylist), which is sent and charged anyway. The cost is known only
   * after sending, so the last SMS can take the wallet a little past the limit. Every booking SMS
   * is recorded in SmsLog. A failed charge is logged and never fails the send.
   */
  async send(message: SmsMessage, charge?: SmsCharge): Promise<boolean> {
    if (charge && !charge.evenInDebt) {
      const payer = await this.prisma.user.findUnique({ where: { id: charge.userId }, select: { walletBalance: true } });
      if (payer && payer.walletBalance <= SMS_DEBT_LIMIT_TOMAN) {
        await this.log(message, charge, SmsLogStatus.SKIPPED_LOW_BALANCE, 0);
        await this.askToTopUp(charge.userId);
        return false;
      }
    }
    let cost = 0;
    try {
      const result = await this.driver.send(message);
      cost = (result && result.cost) || 0;
    } catch (error) {
      // the number is kept out of the log (it's personal data); the kind says what failed
      await this.errors.record({ error, path: `sms:${message.kind}`, context: { driver: this.driver.name } });
      if (charge) await this.log(message, charge, SmsLogStatus.FAILED, 0);
      return false;
    }
    if (charge) {
      await this.log(message, charge, SmsLogStatus.SENT, cost);
      if (cost > 0) {
        try {
          const after = await this.prisma.$transaction((tx) =>
            moveWallet(tx, charge.userId, -cost, WalletTxKind.SMS_COST, { appointmentId: charge.appointmentId, note: charge.note }, true),
          );
          if (after !== null && after <= SMS_DEBT_LIMIT_TOMAN) await this.askToTopUp(charge.userId);
        } catch (error) {
          await this.errors.record({ error, path: `sms-charge:${message.kind}`, context: { cost } });
        }
      }
    }
    return true;
  }

  private async log(message: SmsMessage, charge: SmsCharge, status: SmsLogStatus, costToman: number) {
    try {
      await this.prisma.smsLog.create({
        data: { kind: message.kind, payerUserId: charge.userId, appointmentId: charge.appointmentId, parts: smsParts(message.text), costToman, status },
      });
    } catch (error) {
      await this.errors.record({ error, path: `sms-log:${message.kind}` });
    }
  }

  /**
   * «کیف پول را شارژ کنید» to a stylist whose wallet reached the debt limit: the platform's SMS (no
   * charge), at most once a day (claimed on User.lowBalanceSmsAt, so concurrent sends text once).
   */
  private async askToTopUp(userId: string, now = new Date()) {
    const dayAgo = new Date(now.getTime() - 24 * 3600_000);
    const claimed = await this.prisma.user.updateMany({
      where: { id: userId, phone: { not: null }, OR: [{ lowBalanceSmsAt: null }, { lowBalanceSmsAt: { lt: dayAgo } }] },
      data: { lowBalanceSmsAt: now },
    });
    if (claimed.count === 0) return;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user?.phone) return;
    const params = { limit: faMoney(-SMS_DEBT_LIMIT_TOMAN) };
    await this.send({ kind: "low-balance-stylist", to: user.phone, params, text: lowBalanceText(params) });
  }

}
