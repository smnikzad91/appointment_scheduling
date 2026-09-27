import { Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { JwtPayload } from "../auth/auth.service.js";
import { NotificationsService } from "./notifications.service.js";

const userId = (req: Request) => (req.user as JwtPayload).sub;

/** The signed-in user's own notifications — any role. */
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  listMine(@Req() req: Request) {
    return this.notifications.listMine(userId(req));
  }

  @Post("read-all")
  markAllRead(@Req() req: Request) {
    return this.notifications.markAllRead(userId(req));
  }

  @Patch(":id/read")
  markRead(@Req() req: Request, @Param("id") id: string) {
    return this.notifications.markRead(userId(req), id);
  }
}
