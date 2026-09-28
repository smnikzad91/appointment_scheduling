import { Module } from "@nestjs/common";
import { NotifycloudService } from "./notifycloud.service.js";

@Module({
  providers: [NotifycloudService],
  exports: [NotifycloudService],
})
export class SmsModule {}
