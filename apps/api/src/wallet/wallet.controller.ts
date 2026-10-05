import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { JwtPayload } from "../auth/auth.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PREPAYMENT_PERCENT } from "./prepayment.js";

// The signed-in account's wallet balance and the booking pre-payment rule — read by the booking
// screens (web and app) before confirming. Top-ups and the history live in apps/web (/api/user/finance).
@Controller("wallet")
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async me(@Req() req: Request) {
    const user = await this.prisma.user.findUnique({ where: { id: (req.user as JwtPayload).sub }, select: { walletBalance: true } });
    return { balanceToman: user?.walletBalance ?? 0, prepaymentPercent: PREPAYMENT_PERCENT };
  }
}
