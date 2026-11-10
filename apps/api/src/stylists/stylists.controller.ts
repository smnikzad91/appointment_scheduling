import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { StylistsService } from "./stylists.service.js";
import {
  InviteStylistDto,
  UpdateStylistDto,
  SetStylistServicesDto,
  UpdateOwnStylistDto,
  UpdateStylistServiceOverrideDto,
  SetWorkingHoursDto,
  CreateTimeOffDto,
} from "./dto/stylist.dto.js";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_OWNER)
export class StylistsController {
  constructor(private readonly stylistsService: StylistsService) {}

  @Get("salons/mine/stylists")
  list(@Req() req: Request) {
    return this.stylistsService.listMine((req.user as JwtPayload).sub);
  }

  @Post("salons/mine/stylists")
  invite(@Req() req: Request, @Body() dto: InviteStylistDto) {
    return this.stylistsService.invite((req.user as JwtPayload).sub, dto);
  }

  /**
   * The owner works as a stylist in their own salon too («من هم آرایشگری می‌کنم»): creates (or
   * re-activates) their own stylist profile, so bookings can be made with them.
   */
  @Post("salons/mine/self-stylist")
  addSelf(@Req() req: Request) {
    return this.stylistsService.addSelf((req.user as JwtPayload).sub);
  }

  /** New one-time "set your password" link for a stylist; the previous link stops working. */
  @Post("salons/mine/stylists/:id/setup-link")
  regenerateSetupLink(@Req() req: Request, @Param("id") id: string) {
    return this.stylistsService.regenerateSetupLink((req.user as JwtPayload).sub, id);
  }

  // These "me" routes must be registered before the "stylists/:id" wildcard
  // routes below — Nest matches path patterns in registration order, and
  // ":id" would otherwise greedily match the literal segment "me" first.
  @Get("stylists/me")
  @Roles(Role.STYLIST, Role.SALON_OWNER) // an owner with their own stylist profile (addSelf)
  me(@Req() req: Request) {
    return this.stylistsService.findMe((req.user as JwtPayload).sub);
  }

  @Patch("stylists/me")
  @Roles(Role.STYLIST)
  updateMe(@Req() req: Request, @Body() dto: UpdateOwnStylistDto) {
    return this.stylistsService.updateOwn((req.user as JwtPayload).sub, dto);
  }

  @Patch("stylists/me/services/:serviceId")
  @Roles(Role.STYLIST)
  updateMyServiceOverride(@Req() req: Request, @Param("serviceId") serviceId: string, @Body() dto: UpdateStylistServiceOverrideDto) {
    return this.stylistsService.updateOwnServiceOverride((req.user as JwtPayload).sub, serviceId, dto);
  }

  @Patch("stylists/:id")
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateStylistDto) {
    return this.stylistsService.update((req.user as JwtPayload).sub, id, dto);
  }

  @Put("stylists/:id/services")
  setServices(@Req() req: Request, @Param("id") id: string, @Body() dto: SetStylistServicesDto) {
    return this.stylistsService.setServices((req.user as JwtPayload).sub, id, dto);
  }

  @Put("stylists/me/working-hours")
  @Roles(Role.STYLIST, Role.SALON_OWNER) // an owner with their own stylist profile (addSelf)
  setMyWorkingHours(@Req() req: Request, @Body() dto: SetWorkingHoursDto) {
    return this.stylistsService.setOwnWorkingHours((req.user as JwtPayload).sub, dto.hours);
  }

  @Get("stylists/me/time-off")
  @Roles(Role.STYLIST, Role.SALON_OWNER) // an owner with their own stylist profile (addSelf)
  listMyTimeOff(@Req() req: Request) {
    return this.stylistsService.listOwnTimeOff((req.user as JwtPayload).sub);
  }

  @Post("stylists/me/time-off")
  @Roles(Role.STYLIST, Role.SALON_OWNER) // an owner with their own stylist profile (addSelf)
  createMyTimeOff(@Req() req: Request, @Body() dto: CreateTimeOffDto) {
    return this.stylistsService.createOwnTimeOff((req.user as JwtPayload).sub, dto);
  }

  @Delete("stylists/me/time-off/:id")
  @Roles(Role.STYLIST, Role.SALON_OWNER) // an owner with their own stylist profile (addSelf)
  removeMyTimeOff(@Req() req: Request, @Param("id") id: string) {
    return this.stylistsService.removeOwnTimeOff((req.user as JwtPayload).sub, id);
  }
}
