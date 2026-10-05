import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import type { JwtPayload } from "./auth.service.js";
import { AuthService } from "./auth.service.js";
import { RegisterDto } from "./dto/register.dto.js";
import { RegisterSalonOwnerDto } from "./dto/register-salon-owner.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { RequestOtpDto, VerifyOtpDto } from "./dto/otp.dto.js";
import { CompletePasswordSetupDto } from "./dto/password-setup.dto.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("register-salon-owner")
  registerSalonOwner(@Body() dto: RegisterSalonOwnerDto) {
    return this.authService.registerSalonOwner(dto);
  }

  /** The signed-in account (current role included). */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return this.authService.me((req.user as JwtPayload).sub);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // One-time "set your password" links for invited stylists (issued by the salon owner).
  @Get("password-setup/:token")
  getPasswordSetup(@Param("token") token: string) {
    return this.authService.getPasswordSetup(token);
  }

  /** Sends the SMS code that confirms the link's phone (required to complete the setup). */
  @Post("password-setup/:token/code")
  passwordSetupCode(@Param("token") token: string) {
    return this.authService.sendPasswordSetupCode(token);
  }

  @Post("password-setup")
  completePasswordSetup(@Body() dto: CompletePasswordSetupDto) {
    return this.authService.completePasswordSetup(dto);
  }

  @Post("otp/request")
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.phone, dto.purpose);
  }

  @Post("otp/verify")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }
}
