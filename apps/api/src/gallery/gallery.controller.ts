import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { GalleryService } from "./gallery.service.js";
import { CreateGalleryImageDto, UpdateGalleryImageDto } from "./dto/gallery.dto.js";

const userId = (req: Request) => (req.user as JwtPayload).sub;

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get("salons/mine/gallery")
  @Roles(Role.SALON_OWNER)
  listMine(@Req() req: Request) {
    return this.gallery.listForOwner(userId(req));
  }

  @Post("salons/mine/gallery")
  @Roles(Role.SALON_OWNER)
  addMine(@Req() req: Request, @Body() dto: CreateGalleryImageDto) {
    return this.gallery.addForOwner(userId(req), dto);
  }

  @Get("stylists/me/gallery")
  @Roles(Role.STYLIST)
  listOwn(@Req() req: Request) {
    return this.gallery.listForStylist(userId(req));
  }

  @Post("stylists/me/gallery")
  @Roles(Role.STYLIST)
  addOwn(@Req() req: Request, @Body() dto: CreateGalleryImageDto) {
    return this.gallery.addForStylist(userId(req), dto);
  }

  @Patch("gallery/:id")
  @Roles(Role.SALON_OWNER, Role.STYLIST)
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateGalleryImageDto) {
    return this.gallery.update(userId(req), id, dto);
  }

  @Delete("gallery/:id")
  @Roles(Role.SALON_OWNER, Role.STYLIST)
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.gallery.remove(userId(req), id);
  }
}
