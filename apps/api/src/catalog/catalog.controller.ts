import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { CatalogService } from "./catalog.service.js";
import { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto.js";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_OWNER)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("salons/mine/services")
  list(@Req() req: Request) {
    return this.catalogService.listMine((req.user as JwtPayload).sub);
  }

  @Post("salons/mine/services")
  create(@Req() req: Request, @Body() dto: CreateServiceDto) {
    return this.catalogService.create((req.user as JwtPayload).sub, dto);
  }

  @Patch("services/:id")
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateServiceDto) {
    return this.catalogService.update((req.user as JwtPayload).sub, id, dto);
  }

  @Delete("services/:id")
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.catalogService.remove((req.user as JwtPayload).sub, id);
  }
}
