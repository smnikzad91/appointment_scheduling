import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { AvailabilityService } from "./availability.service.js";
import { AvailabilityController } from "./availability.controller.js";

@Module({
  imports: [SalonsModule],
  providers: [AvailabilityService],
  controllers: [AvailabilityController],
})
export class AvailabilityModule {}
