import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Role, SalonStatus, User } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { generateUniqueSlug } from "../salons/slugify.util.js";
import { RegisterDto } from "./dto/register.dto.js";
import { RegisterSalonOwnerDto } from "./dto/register-salon-owner.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { VerifyOtpDto } from "./dto/otp.dto.js";

export interface JwtPayload {
  sub: string;
  role: Role;
}

const DEFAULT_AVATAR_COUNT = 37;
const OTP_LENGTH = 5;
const OTP_TTL_MINUTES = 5;

function randomDefaultAvatar(): string {
  const n = Math.floor(Math.random() * DEFAULT_AVATAR_COUNT) + 1;
  return `/images/user/user-${String(n).padStart(2, "0")}.jpg`;
}

function randomOtpCode(): string {
  return Math.floor(Math.random() * 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
}

function randomPassword(): string {
  return Math.random().toString(36).slice(2, 10) + "A1";
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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
          city: dto.city,
          address: dto.address,
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

  /** Passwordless login/signup: request a code, then verify it to get a real session.
   * No SMS provider is wired up yet — outside production the code is returned directly
   * so this is testable without one; wire a real provider before shipping. */
  async requestOtp(phone: string) {
    const code = randomOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    await this.prisma.otpCode.create({ data: { phone, code, expiresAt } });

    return {
      success: true,
      ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    };
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
