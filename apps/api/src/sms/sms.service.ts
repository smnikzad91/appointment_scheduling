import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ErrorLogService } from "../error-log/error-log.service.js";
import { LogSmsDriver } from "./drivers/log.driver.js";
import { ProviderSmsDriver } from "./drivers/provider.driver.js";
import type { SmsCharge, SmsDriver, SmsMessage } from "./sms.types.js";
import { WalletTxKind } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { moveWallet } from "../wallet/prepayment.js";

/**
 * Sends SMS through the driver chosen by SMS_DRIVER ("log" — the default — or "provider").
 * Failures go to the admin error log; `send` reports success so callers can decide what a
 * failure means (OTP: the request fails; reminders: skipped, the booking is unaffected).
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly driver: SmsDriver;

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
  }

  /** True when the driver is a real provider (the log driver doesn't deliver anything). */
  get delivers(): boolean {
    return this.driver.name !== "log";
  }

  /**
   * Sends, and — for a booking SMS (`charge`) — takes what the gateway says it cost from the
   * booking's stylist's wallet («هزینه پیامک»; it may go negative: a debt paid off by later income,
   * a top-up, or with the next plan purchase). Booking SMS are never held back for money (owner's
   * rule, 2026-10-05). A failed charge is logged and never fails the send.
   */
  async send(message: SmsMessage, charge?: SmsCharge): Promise<boolean> {
    let cost = 0;
    try {
      const result = await this.driver.send(message);
      cost = (result && result.cost) || 0;
    } catch (error) {
      // the number is kept out of the log (it's personal data); the kind says what failed
      await this.errors.record({ error, path: `sms:${message.kind}`, context: { driver: this.driver.name } });
      return false;
    }
    if (charge && cost > 0) {
      try {
        await this.prisma.$transaction((tx) =>
          moveWallet(tx, charge.userId, -cost, WalletTxKind.SMS_COST, { appointmentId: charge.appointmentId, note: charge.note }, true),
        );
      } catch (error) {
        await this.errors.record({ error, path: `sms-charge:${message.kind}`, context: { cost } });
      }
    }
    return true;
  }

}
