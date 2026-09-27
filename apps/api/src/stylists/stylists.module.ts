import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { StylistsService } from "./stylists.service.js";
import { StylistsController } from "./stylists.controller.js";

@Module({
  imports: [SalonsModule],
  providers: [StylistsService],
  controllers: [StylistsController],
  exports: [StylistsService],
})
export class StylistsModule {}
