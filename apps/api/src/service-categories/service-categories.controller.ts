import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { ServiceCategoriesService } from "./service-categories.service.js";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto.js";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_OWNER)
export class ServiceCategoriesController {
  constructor(private readonly categoriesService: ServiceCategoriesService) {}

  @Get("salons/mine/categories")
  list(@Req() req: Request) {
    return this.categoriesService.listMine((req.user as JwtPayload).sub);
  }

  @Post("salons/mine/categories")
  create(@Req() req: Request, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create((req.user as JwtPayload).sub, dto);
  }

  @Patch("categories/:id")
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update((req.user as JwtPayload).sub, id, dto);
  }

  @Delete("categories/:id")
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.categoriesService.remove((req.user as JwtPayload).sub, id);
  }
}
