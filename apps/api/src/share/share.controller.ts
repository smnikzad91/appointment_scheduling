import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import type { JwtPayload } from "../auth/auth.service.js";
import { ShareService } from "./share.service.js";
import { SetHandleDto } from "./dto/set-handle.dto.js";

/** Short booking links (nobatet.app/book/@<handle>) for the share kit. */
@Controller()
export class ShareController {
  constructor(private readonly share: ShareService) {}

  /** Public: where a short link goes. */
  @Get("book/:handle")
  resolve(@Param("handle") handle: string) {
    return this.share.resolve(handle);
  }

  @Patch("salons/mine/handle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER)
  setSalonHandle(@Req() req: Request, @Body() dto: SetHandleDto) {
    return this.share.setSalonHandle((req.user as JwtPayload).sub, dto.handle);
  }

  @Get("stylists/me/handle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STYLIST)
  stylistHandle(@Req() req: Request) {
    return this.share.stylistHandle((req.user as JwtPayload).sub);
  }

  @Patch("stylists/me/handle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STYLIST)
  setStylistHandle(@Req() req: Request, @Body() dto: SetHandleDto) {
    return this.share.setStylistHandle((req.user as JwtPayload).sub, dto.handle);
  }
}
