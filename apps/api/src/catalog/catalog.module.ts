import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { CatalogService } from "./catalog.service.js";
import { CatalogController } from "./catalog.controller.js";

@Module({
  imports: [SalonsModule],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class CatalogModule {}
