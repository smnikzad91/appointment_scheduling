import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { WalletController } from "./wallet.controller.js";
import { StalePrepaymentService } from "./stale-prepayment.service.js";
import { TopUpSmsService } from "./top-up-sms.service.js";

@Module({ imports: [NotificationsModule], controllers: [WalletController], providers: [StalePrepaymentService, TopUpSmsService] })
export class WalletModule {}
