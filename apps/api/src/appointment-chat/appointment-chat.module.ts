import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { AppointmentChatService } from "./appointment-chat.service.js";
import { AppointmentChatController } from "./appointment-chat.controller.js";

@Module({
  imports: [NotificationsModule],
  providers: [AppointmentChatService],
  controllers: [AppointmentChatController],
})
export class AppointmentChatModule {}
