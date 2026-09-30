import { Module } from "@nestjs/common";
import { ShareController } from "./share.controller.js";
import { ShareService } from "./share.service.js";

@Module({
  providers: [ShareService],
  controllers: [ShareController],
})
export class ShareModule {}
