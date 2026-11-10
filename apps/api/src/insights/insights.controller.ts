import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { CUSTOMER_RANGES, InsightsService, VISIT_RANGES } from "./insights.service.js";

const userId = (req: Request) => (req.user as JwtPayload).sub;

/** ?days= one of the allowed windows; anything else = the middle one. */
const daysOf = (value: string | undefined, allowed: readonly number[]) => {
  const n = Number(value);
  return allowed.includes(n) ? n : allowed[1];
};

@Controller("salons/mine/insights")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_OWNER)
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  /** Public page views: ?days=7|30|90 (default 30). */
  @Get("visits")
  visits(@Req() req: Request, @Query("days") days?: string) {
    return this.insights.visitsForOwner(userId(req), daysOf(days, VISIT_RANGES));
  }

  /** Booking patterns and customers: ?days=30|90|365 (default 90). */
  @Get("customers")
  customers(@Req() req: Request, @Query("days") days?: string) {
    return this.insights.customersForOwner(userId(req), daysOf(days, CUSTOMER_RANGES));
  }
}
