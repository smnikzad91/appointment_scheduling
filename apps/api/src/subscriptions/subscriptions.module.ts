import { Global, Module } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service.js";
import { SubscriptionsController } from "./subscriptions.controller.js";

/** Salon plans and their limits; global because sign-up, stylists and SMS reminders all check them. */
@Global()
@Module({
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
