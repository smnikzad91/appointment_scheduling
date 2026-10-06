import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { AdminAppointmentsService } from "./admin-appointments.service.js";
import { AdminAppointmentsQueryDto } from "./dto/admin-appointments-query.dto.js";

@Controller("admin/appointments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_ADMIN)
export class AdminAppointmentsController {
  constructor(private readonly admin: AdminAppointmentsService) {}

  @Get()
  list(@Query() query: AdminAppointmentsQueryDto) {
    return this.admin.list(query);
  }
}
