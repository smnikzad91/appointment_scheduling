import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { ReviewsService } from "./reviews.service.js";
import { CreateReviewDto, ListReviewsQueryDto, ModerateReviewDto, UpdateReviewDto } from "./dto/create-review.dto.js";

const userId = (req: Request) => (req.user as JwtPayload).sub;

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post("appointments/:id/review")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  create(@Req() req: Request, @Param("id") appointmentId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId(req), appointmentId, dto);
  }

  // Declared before salons/:slug/reviews so "mine" isn't taken for a slug.
  @Patch("reviews/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  updateOwn(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.updateOwn(userId(req), id, dto);
  }

  @Delete("reviews/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  removeOwn(@Req() req: Request, @Param("id") id: string) {
    return this.reviewsService.removeOwn(userId(req), id);
  }

  @Get("salons/mine/reviews")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER)
  listMine(@Req() req: Request, @Query() query: ListReviewsQueryDto) {
    return this.reviewsService.listForOwner(userId(req), query.status);
  }

  @Get("salons/:slug/reviews")
  listForSalon(@Param("slug") slug: string) {
    return this.reviewsService.listForSalon(slug);
  }

  @Get("stylists/me/reviews")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STYLIST)
  listOwn(@Req() req: Request, @Query() query: ListReviewsQueryDto) {
    return this.reviewsService.listForStylist(userId(req), query.status);
  }

  @Patch("reviews/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALON_OWNER, Role.STYLIST)
  moderate(@Req() req: Request, @Param("id") id: string, @Body() dto: ModerateReviewDto) {
    return this.reviewsService.moderate(userId(req), id, dto);
  }
}
