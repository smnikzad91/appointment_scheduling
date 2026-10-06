import { Logger } from "@nestjs/common";
import type { SmsDriver, SmsMessage } from "../sms.types.js";

/**
 * Default driver (SMS_DRIVER unset or "log"): writes messages to the server log instead of
 * sending them. OTP codes are masked in production so they never sit in log files.
 */
export class LogSmsDriver implements SmsDriver {
  readonly name = "log";
  private readonly logger = new Logger("SMS");

  async send(message: SmsMessage): Promise<void> {
    const production = process.env.NODE_ENV === "production";
    const text = production && message.kind === "otp" ? message.text.replace(message.params.code, "•••••") : message.text;
    this.logger.log(`[${message.kind}] → ${message.to}: ${text.replace(/\n/g, " ")}`);
  }
}
