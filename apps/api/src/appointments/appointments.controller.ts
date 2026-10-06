import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { Role } from "@appointment-scheduling/database";
import { JwtPayload } from "../auth/auth.service.js";
import { AppointmentsService } from "./appointments.service.js";
import { CreateAppointmentDto, CreateSalonAppointmentDto, CustomerLookupQueryDto } from "./dto/create-appointment.dto.js";
import { UpdateAppointmentStatusDto } from "./dto/update-status.dto.js";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto.js";

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

  // A stylist books only themselves (stylistId is ignored for them).
  @Post("salon")
  @Roles(Role.SALON_OWNER, Role.STYLIST)
  createForSalon(@Req() req: Request, @Body() dto: CreateSalonAppointmentDto) {
    return this.appointmentsService.createForSalon(req.user as JwtPayload, dto);
  }

  @Get("salon/customer")
  @Roles(Role.SALON_OWNER, Role.STYLIST)
  lookupCustomer(@Req() req: Request, @Query() query: CustomerLookupQueryDto) {
    return this.appointmentsService.lookupSalonCustomer(req.user as JwtPayload, query.phone);
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

  // Services, time and notes of an open appointment — the stylist's own, or any in the owner's salon.
  @Patch(":id")
  @Roles(Role.STYLIST, Role.SALON_OWNER)
  updateDetails(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.updateDetails(req.user as JwtPayload, id, dto);
  }

  @Patch(":id/status")
  @Roles(Role.CUSTOMER, Role.STYLIST, Role.SALON_OWNER)
  updateStatus(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateAppointmentStatusDto) {
    const user = req.user as JwtPayload;
    return this.appointmentsService.updateStatus(user, id, dto.status, dto.balanceMethod);
  }

  /** The customer pays the rest of a completed booking from their wallet (when the stylist asked for it). */
  @Post(":id/pay-balance")
  @Roles(Role.CUSTOMER)
  payBalance(@Req() req: Request, @Param("id") id: string) {
    return this.appointmentsService.payBalance((req.user as JwtPayload).sub, id);
  }
}
