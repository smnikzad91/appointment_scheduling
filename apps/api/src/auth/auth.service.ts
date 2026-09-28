import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomInt } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Role, SalonStatus, User } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { generateUniqueSlug } from "../salons/slugify.util.js";
import { RegisterDto } from "./dto/register.dto.js";
import { RegisterSalonOwnerDto } from "./dto/register-salon-owner.dto.js";
import { assertIranCoordinates, resolveProvinceCity } from "../common/location.js";
import { LoginDto } from "./dto/login.dto.js";
import { VerifyOtpDto } from "./dto/otp.dto.js";
import { NotifycloudService } from "../sms/notifycloud.service.js";

export interface JwtPayload {
  sub: string;
  role: Role;
}

const DEFAULT_AVATAR_COUNT = 37;
const OTP_LENGTH = 5;
const OTP_TTL_MINUTES = 5;
// Per-phone throttle, so one number can't burn the SMS key's 30/min quota or its balance.
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_PER_HOUR = 5;

function randomDefaultAvatar(): string {
  const n = Math.floor(Math.random() * DEFAULT_AVATAR_COUNT) + 1;
  return `/images/user/user-${String(n).padStart(2, "0")}.jpg`;
}

function randomOtpCode(): string {
  return randomInt(10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
}

function randomPassword(): string {
  return Math.random().toString(36).slice(2, 10) + "A1";
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: NotifycloudService,
  ) {}

  async register(dto: RegisterDto) {
    await this.assertIdentifierAvailable(dto.phone, dto.email);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: Role.CUSTOMER,
        avatarUrl: randomDefaultAvatar(),
      },
    });

    return this.buildAuthResponse(user);
  }

  async registerSalonOwner(dto: RegisterSalonOwnerDto) {
    const location = resolveProvinceCity(dto.province, dto.city);
    assertIranCoordinates(dto.latitude, dto.longitude);
    await this.assertIdentifierAvailable(dto.phone, dto.email);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const slug = await generateUniqueSlug(this.prisma, dto.salonName);

    const user = await this.prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          phone: dto.phone,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: Role.SALON_OWNER,
          avatarUrl: randomDefaultAvatar(),
        },
      });

      await tx.salon.create({
        data: {
          ownerId: owner.id,
          name: dto.salonName,
          slug,
          province: location.province,
          city: location.city,
          address: dto.address.trim(),
          latitude: dto.latitude,
          longitude: dto.longitude,
          phone: dto.salonPhone ?? dto.phone,
          // New salons need platform-admin approval before they're publicly visible.
          status: SalonStatus.PENDING,
        },
      });

      return owner;
    });

    return this.buildAuthResponse(user);
  }

  private async assertIdentifierAvailable(phone: string, email?: string) {
    const existingPhone = await this.prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new ConflictException("Phone number already registered");
    }

    if (email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw new ConflictException("Email already registered");
      }
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.identifier }, { email: dto.identifier }] },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.buildAuthResponse(user);
  }

  /** Passwordless login/signup: request a code (sent by SMS via notifycloud), then verify it
   * to get a real session. Without NOTIFYCLOUD_API_KEY nothing is sent — outside production
   * the code is returned as devCode so this is testable without the gateway. */
  async requestOtp(phone: string) {
    await this.assertOtpNotThrottled(phone);

    const code = randomOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    const otp = await this.prisma.otpCode.create({ data: { phone, code, expiresAt } });
    const isProduction = process.env.NODE_ENV === "production";

    if (this.sms.enabled) {
      try {
        // Kept under 70 chars so it stays a single (cheapest) SMS segment.
        await this.sms.sendSms(phone, `کد ورود شما: ${code}\nاعتبار: ${OTP_TTL_MINUTES} دقیقه`, otp.id);
      } catch {
        // Drop the undeliverable code so it doesn't count against the phone's throttle.
        await this.prisma.otpCode.delete({ where: { id: otp.id } });
        throw new ServiceUnavailableException("Could not send the verification code");
      }
    } else if (isProduction) {
      this.logger.error("NOTIFYCLOUD_API_KEY is not set — OTP codes cannot be delivered");
      await this.prisma.otpCode.delete({ where: { id: otp.id } });
      throw new ServiceUnavailableException("Could not send the verification code");
    }

    return {
      success: true,
      ...(!isProduction ? { devCode: code } : {}),
    };
  }

  private async assertOtpNotThrottled(phone: string) {
    const hourAgo = new Date(Date.now() - 60 * 60_000);
    const recent = await this.prisma.otpCode.findMany({
      where: { phone, createdAt: { gt: hourAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const secondsSinceLast = recent.length ? (Date.now() - recent[0].createdAt.getTime()) / 1000 : Infinity;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS || recent.length >= OTP_MAX_PER_HOUR) {
      throw new HttpException("Too many code requests, try again later", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone: dto.phone, code: dto.code, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) {
      throw new UnauthorizedException("Invalid or expired code");
    }

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      if (!dto.firstName || !dto.lastName) {
        throw new BadRequestException("firstName and lastName are required for a new account");
      }
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: Role.CUSTOMER,
          passwordHash: await bcrypt.hash(randomPassword(), 10),
          avatarUrl: randomDefaultAvatar(),
        },
      });
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }
}
