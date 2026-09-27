import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { ReviewsService } from "./reviews.service.js";
import { ReviewsController } from "./reviews.controller.js";

@Module({
  imports: [SalonsModule],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
