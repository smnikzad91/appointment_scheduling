import { BadRequestException, Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { Role, SalonStatus } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { SalonsService } from "./salons.service.js";
import { UpdateSalonStatusDto } from "./dto/update-salon-status.dto.js";

@Controller("admin/salons")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_ADMIN)
export class AdminSalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Get()
  list(@Query("status") status?: string) {
    if (status && !(Object.values(SalonStatus) as string[]).includes(status)) {
      throw new BadRequestException("Invalid status filter");
    }
    return this.salonsService.listForAdmin(status as SalonStatus | undefined);
  }

  @Patch(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: UpdateSalonStatusDto) {
    return this.salonsService.setStatus(id, dto);
  }
}
