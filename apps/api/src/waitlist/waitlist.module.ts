import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { WaitlistService } from "./waitlist.service.js";
import { WaitlistController } from "./waitlist.controller.js";

@Module({
  imports: [NotificationsModule],
  providers: [WaitlistService],
  controllers: [WaitlistController],
  exports: [WaitlistService],
})
export class WaitlistModule {}
