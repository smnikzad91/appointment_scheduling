import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { AccountingService } from "./accounting.service.js";
import {
  AdjustChargeDto,
  CreateExpenseDto,
  CreatePayoutDto,
  CreateStylistExpenseDto,
  PayoutQueryDto,
  PeriodQueryDto,
  StylistExpenseQueryDto,
  UpdateExpenseDto,
  UpdateStylistExpenseDto,
} from "./dto/accounting.dto.js";

const userId = (req: Request) => (req.user as JwtPayload).sub;

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  // ── Salon owner ──
  @Get("salons/mine/accounting")
  @Roles(Role.SALON_OWNER)
  summary(@Req() req: Request, @Query() query: PeriodQueryDto) {
    return this.accounting.summaryForOwner(userId(req), query);
  }

  @Get("salons/mine/accounting/income")
  @Roles(Role.SALON_OWNER)
  income(@Req() req: Request, @Query() query: PeriodQueryDto) {
    return this.accounting.incomeForOwner(userId(req), query);
  }

  @Patch("salons/mine/accounting/appointments/:id/charge")
  @Roles(Role.SALON_OWNER)
  adjustCharge(@Req() req: Request, @Param("id") id: string, @Body() dto: AdjustChargeDto) {
    return this.accounting.adjustCharge(userId(req), id, dto);
  }

  @Get("salons/mine/payouts")
  @Roles(Role.SALON_OWNER)
  listPayouts(@Req() req: Request, @Query() query: PayoutQueryDto) {
    return this.accounting.listPayouts(userId(req), query);
  }

  @Post("salons/mine/payouts")
  @Roles(Role.SALON_OWNER)
  createPayout(@Req() req: Request, @Body() dto: CreatePayoutDto) {
    return this.accounting.createPayout(userId(req), dto);
  }

  @Delete("salons/mine/payouts/:id")
  @Roles(Role.SALON_OWNER)
  removePayout(@Req() req: Request, @Param("id") id: string) {
    return this.accounting.removePayout(userId(req), id);
  }

  @Get("salons/mine/expenses")
  @Roles(Role.SALON_OWNER)
  listExpenses(@Req() req: Request, @Query() query: PeriodQueryDto) {
    return this.accounting.listExpenses(userId(req), query);
  }

  @Post("salons/mine/expenses")
  @Roles(Role.SALON_OWNER)
  createExpense(@Req() req: Request, @Body() dto: CreateExpenseDto) {
    return this.accounting.createExpense(userId(req), dto);
  }

  @Patch("salons/mine/expenses/:id")
  @Roles(Role.SALON_OWNER)
  updateExpense(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateExpenseDto) {
    return this.accounting.updateExpense(userId(req), id, dto);
  }

  @Delete("salons/mine/expenses/:id")
  @Roles(Role.SALON_OWNER)
  removeExpense(@Req() req: Request, @Param("id") id: string) {
    return this.accounting.removeExpense(userId(req), id);
  }

  // ── Stylist ──
  @Get("stylists/me/earnings")
  @Roles(Role.STYLIST)
  earnings(@Req() req: Request, @Query() query: PeriodQueryDto) {
    return this.accounting.earningsForStylist(userId(req), query);
  }

  // Stylists only ever reach their own expenses: every query is scoped to the stylist profile of
  // the signed-in user, so another stylist's id just reads as "not found".
  @Get("stylists/me/expenses")
  @Roles(Role.STYLIST)
  listMyExpenses(@Req() req: Request, @Query() query: StylistExpenseQueryDto) {
    return this.accounting.listStylistExpenses(userId(req), query);
  }

  @Post("stylists/me/expenses")
  @Roles(Role.STYLIST)
  createMyExpense(@Req() req: Request, @Body() dto: CreateStylistExpenseDto) {
    return this.accounting.createStylistExpense(userId(req), dto);
  }

  @Patch("stylists/me/expenses/:id")
  @Roles(Role.STYLIST)
  updateMyExpense(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateStylistExpenseDto) {
    return this.accounting.updateStylistExpense(userId(req), id, dto);
  }

  @Delete("stylists/me/expenses/:id")
  @Roles(Role.STYLIST)
  removeMyExpense(@Req() req: Request, @Param("id") id: string) {
    return this.accounting.removeStylistExpense(userId(req), id);
  }
}
