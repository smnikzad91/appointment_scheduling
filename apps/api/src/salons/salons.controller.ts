import { Body, Controller, Get, NotFoundException, Param, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { SalonsService } from "./salons.service.js";
import { UpdateSalonDto } from "./dto/update-salon.dto.js";

@Controller("salons")
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Get()
  list() {
    return this.salonsService.listPublic();
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER)
  mine(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.salonsService.findMine(user.sub);
  }

  @Patch("mine")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER)
  updateMine(@Req() req: Request, @Body() dto: UpdateSalonDto) {
    const user = req.user as JwtPayload;
    return this.salonsService.updateMine(user.sub, dto);
  }

  @Get(":slug")
  async getBySlug(@Param("slug") slug: string) {
    const salon = await this.salonsService.findPublicBySlug(slug);
    if (!salon) {
      throw new NotFoundException("Salon not found");
    }
    return salon;
  }
}
