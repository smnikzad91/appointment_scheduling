import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { WaitlistModule } from "../waitlist/waitlist.module.js";
import { AppointmentsService } from "./appointments.service.js";
import { AppointmentsController } from "./appointments.controller.js";
import { AdminAppointmentsController } from "./admin-appointments.controller.js";
import { AdminAppointmentsService } from "./admin-appointments.service.js";

@Module({
  imports: [NotificationsModule, WaitlistModule],
  providers: [AppointmentsService, AdminAppointmentsService],
  controllers: [AppointmentsController, AdminAppointmentsController],
})
export class AppointmentsModule {}
