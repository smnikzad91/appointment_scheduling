import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { WaitlistModule } from "../waitlist/waitlist.module.js";
import { SmsModule } from "../sms/sms.module.js";
import { AppointmentsService } from "./appointments.service.js";
import { AppointmentsController } from "./appointments.controller.js";
import { AppointmentRemindersService } from "./appointment-reminders.service.js";

@Module({
  imports: [NotificationsModule, WaitlistModule, SmsModule],
  providers: [AppointmentsService, AppointmentRemindersService],
  controllers: [AppointmentsController],
})
export class AppointmentsModule {}
