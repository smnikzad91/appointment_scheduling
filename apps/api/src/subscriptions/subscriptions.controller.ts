import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { SubscriptionsService } from "./subscriptions.service.js";
import { SetSalonSubscriptionDto } from "./dto/set-salon-subscription.dto.js";
import { PurchasePlanDto } from "./dto/purchase-plan.dto.js";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("salons/mine/subscription")
  @Roles(Role.SALON_OWNER)
  mine(@Req() req: Request) {
    return this.subscriptions.getForOwner((req.user as JwtPayload).sub);
  }

  @Get("salons/mine/subscription/plans")
  @Roles(Role.SALON_OWNER)
  plans() {
    return this.subscriptions.purchasablePlans();
  }

  /** Buy or renew a plan from the owner's wallet. */
  @Post("salons/mine/subscription/purchase")
  @Roles(Role.SALON_OWNER)
  purchase(@Req() req: Request, @Body() dto: PurchasePlanDto) {
    return this.subscriptions.purchase((req.user as JwtPayload).sub, dto);
  }

  @Patch("admin/salons/:id/subscription")
  @Roles(Role.PLATFORM_ADMIN)
  setForSalon(@Param("id") id: string, @Body() dto: SetSalonSubscriptionDto) {
    return this.subscriptions.setForSalon(id, dto);
  }
}
