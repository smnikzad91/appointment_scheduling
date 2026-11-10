import { BadRequestException, Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { IsIn, ValidateIf } from "class-validator";
import { ClientGender, Role, SalonStatus } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { SalonsService } from "./salons.service.js";
import { UpdateSalonStatusDto } from "./dto/update-salon-status.dto.js";

class SetClientGenderDto {
  /** MEN, WOMEN, or null to clear it. */
  @ValidateIf((_, v) => v !== null)
  @IsIn(["MEN", "WOMEN"])
  clientGender!: ClientGender | null;
}

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

  /** Who a business serves (آقایان / بانوان) — the admin sets it for the ones registered before the field existed. */
  @Patch(":id/client-gender")
  setClientGender(@Param("id") id: string, @Body() dto: SetClientGenderDto) {
    return this.salonsService.setClientGender(id, dto.clientGender);
  }

  @Patch(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: UpdateSalonStatusDto) {
    return this.salonsService.setStatus(id, dto);
  }
}
