import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { ServiceCategoriesService } from "./service-categories.service.js";
import { ServiceCategoriesController } from "./service-categories.controller.js";

@Module({
  imports: [SalonsModule],
  providers: [ServiceCategoriesService],
  controllers: [ServiceCategoriesController],
})
export class ServiceCategoriesModule {}
