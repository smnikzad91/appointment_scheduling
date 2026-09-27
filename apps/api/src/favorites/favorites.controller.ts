import { Controller, Delete, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { JwtPayload } from "../auth/auth.service.js";
import { FavoritesService } from "./favorites.service.js";

const userId = (req: Request) => (req.user as JwtPayload).sub;

@Controller("me/favorites")
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@Req() req: Request) {
    return this.favorites.list(userId(req));
  }

  @Get("ids")
  ids(@Req() req: Request) {
    return this.favorites.ids(userId(req));
  }

  @Put(":salonId")
  add(@Req() req: Request, @Param("salonId") salonId: string) {
    return this.favorites.add(userId(req), salonId);
  }

  @Delete(":salonId")
  remove(@Req() req: Request, @Param("salonId") salonId: string) {
    return this.favorites.remove(userId(req), salonId);
  }
}
