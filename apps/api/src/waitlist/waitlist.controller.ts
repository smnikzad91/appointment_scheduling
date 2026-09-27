import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { WaitlistService } from "./waitlist.service.js";
import { JoinWaitlistDto } from "./dto/join-waitlist.dto.js";

const userId = (req: Request) => (req.user as JwtPayload).sub;

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Post("salons/:slug/waitlist")
  join(@Req() req: Request, @Param("slug") slug: string, @Body() dto: JoinWaitlistDto) {
    return this.waitlist.join(userId(req), slug, dto);
  }

  @Get("me/waitlist")
  listMine(@Req() req: Request) {
    return this.waitlist.listMine(userId(req));
  }

  @Delete("me/waitlist/:id")
  leave(@Req() req: Request, @Param("id") id: string) {
    return this.waitlist.leave(userId(req), id);
  }
}
