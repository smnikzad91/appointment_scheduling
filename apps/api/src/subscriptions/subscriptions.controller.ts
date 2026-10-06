import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { SubscriptionsService } from "./subscriptions.service.js";
import { SetSalonSubscriptionDto } from "./dto/set-salon-subscription.dto.js";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("salons/mine/subscription")
  @Roles(Role.SALON_OWNER)
  mine(@Req() req: Request) {
    return this.subscriptions.getForOwner((req.user as JwtPayload).sub);
  }

  @Patch("admin/salons/:id/subscription")
  @Roles(Role.PLATFORM_ADMIN)
  setForSalon(@Param("id") id: string, @Body() dto: SetSalonSubscriptionDto) {
    return this.subscriptions.setForSalon(id, dto);
  }
}
