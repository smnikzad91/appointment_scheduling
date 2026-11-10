import { BadRequestException, Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { IsIn } from "class-validator";
import { Role, StylistApproval } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { StylistsService } from "./stylists.service.js";

class SetStylistApprovalDto {
  @IsIn(["APPROVED", "REJECTED"])
  approval!: "APPROVED" | "REJECTED";
}

/** The platform admin approves the stylists salons invite, separately from approving the salon. */
@Controller("admin/stylists")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_ADMIN)
export class AdminStylistsController {
  constructor(private readonly stylistsService: StylistsService) {}

  @Get()
  list(@Query("approval") approval?: string) {
    if (approval && !(Object.values(StylistApproval) as string[]).includes(approval)) {
      throw new BadRequestException("Invalid approval filter");
    }
    return this.stylistsService.listForAdmin(approval as StylistApproval | undefined);
  }

  @Patch(":id/approval")
  setApproval(@Param("id") id: string, @Body() dto: SetStylistApprovalDto) {
    return this.stylistsService.setApproval(id, dto.approval);
  }
}
