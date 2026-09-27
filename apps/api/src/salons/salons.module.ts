import { Module } from "@nestjs/common";
import { SalonsService } from "./salons.service.js";
import { SalonsController } from "./salons.controller.js";
import { AdminSalonsController } from "./admin-salons.controller.js";
import { SalonSearchService } from "./salon-search.service.js";
import { LocationsController } from "./locations.controller.js";

@Module({
  providers: [SalonsService, SalonSearchService],
  controllers: [SalonsController, AdminSalonsController, LocationsController],
  exports: [SalonsService, SalonSearchService],
})
export class SalonsModule {}
