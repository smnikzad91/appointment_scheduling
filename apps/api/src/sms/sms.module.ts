import { Global, Module } from "@nestjs/common";
import { SmsService } from "./sms.service.js";
import { ReminderService } from "./reminder.service.js";
import { RebookReminderService } from "./rebook-reminder.service.js";
import { TrialReminderService } from "./trial-reminder.service.js";
import { RebookController } from "./rebook.controller.js";

/** SMS sending (driver chosen by SMS_DRIVER), the minute-by-minute reminder job, the daily "book again" job and the trial-ending reminder. */
@Global()
@Module({
  controllers: [RebookController],
  providers: [SmsService, ReminderService, RebookReminderService, TrialReminderService],
  exports: [SmsService],
})
export class SmsModule {}
