import { Module } from "@nestjs/common";
import { ShowcaseService } from "./showcase.service.js";
import { AdminShowcaseController, ShowcaseController } from "./showcase.controller.js";

@Module({
  providers: [ShowcaseService],
  controllers: [ShowcaseController, AdminShowcaseController],
})
export class ShowcaseModule {}
