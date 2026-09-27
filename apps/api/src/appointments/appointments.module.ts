import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { AppointmentsService } from "./appointments.service.js";
import { AppointmentsController } from "./appointments.controller.js";

@Module({
  imports: [NotificationsModule],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
})
export class AppointmentsModule {}
