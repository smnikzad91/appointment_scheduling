import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { AccountingService } from "./accounting.service.js";
import { AccountingController } from "./accounting.controller.js";

@Module({
  imports: [SalonsModule],
  providers: [AccountingService],
  controllers: [AccountingController],
})
export class AccountingModule {}
