import { Global, Module } from "@nestjs/common";
import { SmsService } from "./sms.service.js";
import { ReminderService } from "./reminder.service.js";

/** SMS sending (driver chosen by SMS_DRIVER) and the "1 hour before" reminder job. */
@Global()
@Module({
  providers: [SmsService, ReminderService],
  exports: [SmsService],
})
export class SmsModule {}
