import { Module } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service.js";
import { AppointmentsController } from "./appointments.controller.js";

@Module({
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
})
export class AppointmentsModule {}
