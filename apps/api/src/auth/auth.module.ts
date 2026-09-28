import { Module } from "@nestjs/common";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { JwtStrategy } from "./strategies/jwt.strategy.js";
import { SmsModule } from "../sms/sms.module.js";

@Module({
  imports: [
    PassportModule,
    SmsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        // expiresIn accepts a duration string like "7d"; env values are untyped strings
        signOptions: { expiresIn: config.get<string>("JWT_EXPIRES_IN", "7d") as NonNullable<JwtModuleOptions["signOptions"]>["expiresIn"] },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
