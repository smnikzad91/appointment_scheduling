import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { SalonsModule } from "../salons/salons.module.js";
import { AccountingService } from "./accounting.service.js";
import { AccountingController } from "./accounting.controller.js";

@Module({
  imports: [SalonsModule, NotificationsModule],
  providers: [AccountingService],
  controllers: [AccountingController],
})
export class AccountingModule {}
