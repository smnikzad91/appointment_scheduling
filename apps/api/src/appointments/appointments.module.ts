import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { WaitlistModule } from "../waitlist/waitlist.module.js";
import { AppointmentsService } from "./appointments.service.js";
import { AppointmentsController } from "./appointments.controller.js";

@Module({
  imports: [NotificationsModule, WaitlistModule],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
})
export class AppointmentsModule {}
