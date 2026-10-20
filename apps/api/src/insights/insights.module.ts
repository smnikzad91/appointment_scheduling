import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { InsightsService } from "./insights.service.js";
import { InsightsController } from "./insights.controller.js";

/** The owner panel's «آمار بازدید» and «آنالیز رفتار مشتری». */
@Module({
  imports: [SalonsModule],
  providers: [InsightsService],
  controllers: [InsightsController],
})
export class InsightsModule {}
