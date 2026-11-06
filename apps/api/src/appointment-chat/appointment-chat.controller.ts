import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { IsString, MaxLength } from "class-validator";
import { Role } from "@appointment-scheduling/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtPayload } from "../auth/auth.service.js";
import { AppointmentChatService, CHAT_MESSAGE_MAX } from "./appointment-chat.service.js";

class SendChatMessageDto {
  @IsString()
  @MaxLength(CHAT_MESSAGE_MAX * 2)
  text!: string;
}

/** A booking's chat, customer ↔ salon (owner / independent stylist / the booking's stylist). */
@Controller("appointments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER, Role.SALON_OWNER, Role.STYLIST)
export class AppointmentChatController {
  constructor(private readonly chat: AppointmentChatService) {}

  /** Unread messages per booking, for the list badges. Registered before ":id" so "chats" isn't taken for an id. */
  @Get("chats/unread")
  unread(@Req() req: Request) {
    return this.chat.unread(req.user as JwtPayload);
  }

  @Get(":id/messages")
  list(@Req() req: Request, @Param("id") id: string) {
    return this.chat.list(req.user as JwtPayload, id);
  }

  @Post(":id/messages")
  send(@Req() req: Request, @Param("id") id: string, @Body() dto: SendChatMessageDto) {
    return this.chat.send(req.user as JwtPayload, id, dto.text);
  }

  @Post(":id/messages/read")
  read(@Req() req: Request, @Param("id") id: string) {
    return this.chat.markRead(req.user as JwtPayload, id);
  }
}
