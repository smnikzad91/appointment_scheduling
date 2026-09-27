import { Body, Controller, Get, Put, Query, UseGuards } from "@nestjs/common";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { ShowcaseService } from "./showcase.service.js";
import { SearchQueryDto, SetFeaturedDto, UpdateBannerDto } from "./dto/showcase.dto.js";

/** Public: everything the home page shows. */
@Controller("showcase")
export class ShowcaseController {
  constructor(private readonly showcase: ShowcaseService) {}

  @Get()
  get() {
    return this.showcase.getPublic();
  }
}

/** Platform admin: edit the home page showcase. */
@Controller("admin/showcase")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_ADMIN)
export class AdminShowcaseController {
  constructor(private readonly showcase: ShowcaseService) {}

  @Get()
  get() {
    return this.showcase.getAdmin();
  }

  @Put("banner")
  updateBanner(@Body() dto: UpdateBannerDto) {
    return this.showcase.updateBanner(dto);
  }

  @Put("featured-salons")
  setFeaturedSalons(@Body() dto: SetFeaturedDto) {
    return this.showcase.setFeaturedSalons(dto.ids);
  }

  @Put("featured-stylists")
  setFeaturedStylists(@Body() dto: SetFeaturedDto) {
    return this.showcase.setFeaturedStylists(dto.ids);
  }

  @Get("salons")
  searchSalons(@Query() query: SearchQueryDto) {
    return this.showcase.searchSalons(query.q);
  }

  @Get("stylists")
  searchStylists(@Query() query: SearchQueryDto) {
    return this.showcase.searchStylists(query.q);
  }
}
