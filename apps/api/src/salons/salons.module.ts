import { Module } from "@nestjs/common";
import { SalonsService } from "./salons.service.js";
import { SalonsController } from "./salons.controller.js";
import { AdminSalonsController } from "./admin-salons.controller.js";

@Module({
  providers: [SalonsService],
  controllers: [SalonsController, AdminSalonsController],
  exports: [SalonsService],
})
export class SalonsModule {}
