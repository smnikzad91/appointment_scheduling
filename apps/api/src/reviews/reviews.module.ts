import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ReviewsService } from "./reviews.service.js";
import { ReviewsController } from "./reviews.controller.js";

@Module({
  imports: [SalonsModule, NotificationsModule],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
