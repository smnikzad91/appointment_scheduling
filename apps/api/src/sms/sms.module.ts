import { Global, Module } from "@nestjs/common";
import { SmsService } from "./sms.service.js";
import { ReminderService } from "./reminder.service.js";
import { RebookReminderService } from "./rebook-reminder.service.js";

/** SMS sending (driver chosen by SMS_DRIVER), the minute-by-minute reminder job and the daily "book again" job. */
@Global()
@Module({
  providers: [SmsService, ReminderService, RebookReminderService],
  exports: [SmsService],
})
export class SmsModule {}
