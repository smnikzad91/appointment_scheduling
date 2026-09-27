import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { ReviewsService } from "./reviews.service.js";
import { CreateReviewDto } from "./dto/create-review.dto.js";

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post("appointments/:id/review")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  create(@Req() req: Request, @Param("id") appointmentId: string, @Body() dto: CreateReviewDto) {
    const user = req.user as JwtPayload;
    return this.reviewsService.create(user.sub, appointmentId, dto);
  }

  @Get("salons/:slug/reviews")
  listForSalon(@Param("slug") slug: string) {
    return this.reviewsService.listForSalon(slug);
  }
}
