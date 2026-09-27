import { Body, Controller, Get, Param, Post } from "@nestjs/common";
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

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // One-time "set your password" links for invited stylists (issued by the salon owner).
  @Get("password-setup/:token")
  getPasswordSetup(@Param("token") token: string) {
    return this.authService.getPasswordSetup(token);
  }

  @Post("password-setup")
  completePasswordSetup(@Body() dto: CompletePasswordSetupDto) {
    return this.authService.completePasswordSetup(dto);
  }

  @Post("otp/request")
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.phone);
  }

  @Post("otp/verify")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }
}
