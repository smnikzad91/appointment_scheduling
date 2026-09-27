import { Controller, Get, Param, Query } from "@nestjs/common";
import { AvailabilityService } from "./availability.service.js";
import { AvailabilityQueryDto } from "./dto/availability-query.dto.js";

@Controller("salons/:slug/availability")
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  get(@Param("slug") slug: string, @Query() query: AvailabilityQueryDto) {
    return this.availabilityService.getAvailability(slug, query);
  }
}
