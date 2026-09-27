import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { Role } from "@appointment-scheduling/database";
import { JwtPayload } from "../auth/auth.service.js";
import { AppointmentsService } from "./appointments.service.js";
import { CreateAppointmentDto } from "./dto/create-appointment.dto.js";
import { UpdateAppointmentStatusDto } from "./dto/update-status.dto.js";

@Controller("appointments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  create(@Req() req: Request, @Body() dto: CreateAppointmentDto) {
    const user = req.user as JwtPayload;
    return this.appointmentsService.create(user.sub, dto);
  }

  @Get("mine")
  @Roles(Role.CUSTOMER)
  mine(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.appointmentsService.findMineAsCustomer(user.sub);
  }

  @Get("stylist/mine")
  @Roles(Role.STYLIST)
  mineAsStylist(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.appointmentsService.findMineAsStylist(user.sub);
  }

  @Get("salon/mine")
  @Roles(Role.SALON_OWNER)
  mineAsSalonOwner(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.appointmentsService.findMineAsSalonOwner(user.sub);
  }

  @Patch(":id/status")
  @Roles(Role.CUSTOMER, Role.STYLIST, Role.SALON_OWNER)
  updateStatus(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateAppointmentStatusDto) {
    const user = req.user as JwtPayload;
    return this.appointmentsService.updateStatus(user, id, dto.status);
  }
}
