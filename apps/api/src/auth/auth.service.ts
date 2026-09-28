import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
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
import { CompletePasswordSetupDto } from "./dto/password-setup.dto.js";
import { hashSetupToken } from "./password-setup.util.js";
import { SmsService } from "../sms/sms.service.js";
import { otpDomain, otpText } from "../sms/sms.text.js";

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
    private readonly sms: SmsService,
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

  /** Who a one-time "set your password" link is for — shown on the page before they choose one. */
  async getPasswordSetup(token: string) {
    const setup = await this.findUsableSetupToken(token);
    const { user } = setup;
    return {
      firstName: user.firstName,
      phone: user.phone,
      salonName: user.stylist?.salon.name ?? null,
      // false = they already have a password and this link resets it.
      firstTime: user.mustSetPassword,
      expiresAt: setup.expiresAt,
    };
  }

  /**
   * Sets the password through a one-time link and burns the link. Returns the phone number so
   * the web app can sign the stylist straight in with it.
   */
  async completePasswordSetup(dto: CompletePasswordSetupDto) {
    const setup = await this.findUsableSetupToken(dto.token);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.$transaction(async (tx) => {
      // Claim the link atomically: if two requests race, only one sees usedAt still null.
      const claimed = await tx.passwordSetupToken.updateMany({ where: { id: setup.id, usedAt: null }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) throw new NotFoundException("Invalid or expired link");
      await tx.user.update({ where: { id: setup.userId }, data: { passwordHash, mustSetPassword: false } });
      await tx.passwordSetupToken.deleteMany({ where: { userId: setup.userId, usedAt: null } });
    });
    return { phone: setup.user.phone };
  }

  private async findUsableSetupToken(token: string) {
    const setup = await this.prisma.passwordSetupToken.findUnique({
      where: { tokenHash: hashSetupToken(token) },
      include: { user: { include: { stylist: { include: { salon: { select: { name: true } } } } } } },
    });
    if (!setup || setup.usedAt || setup.expiresAt <= new Date()) {
      throw new NotFoundException("Invalid or expired link");
    }
    return setup;
  }

  /** Passwordless login/signup: request a code, then verify it to get a real session.
   * The code goes out by SMS (SmsService; SMS_DRIVER picks the provider). It is also returned as
   * devCode outside production, and — a temporary bypass until the SMS provider is connected —
   * whenever the driver doesn't really deliver (SMS_DRIVER=log), so booking and sign-in keep
   * working; the web app then fills it in by itself. That means phone numbers aren't verified
   * while the bypass is on; it ends by itself once SMS_DRIVER=provider. */
  async requestOtp(phone: string) {
    const code = randomOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    await this.prisma.otpCode.create({ data: { phone, code, expiresAt } });

    const sent = await this.sms.send({ kind: "otp", to: phone, params: { code, domain: otpDomain() }, text: otpText(code) });
    const bypass = process.env.NODE_ENV !== "production" || !this.sms.delivers;
    if (!sent && !bypass) throw new ServiceUnavailableException("Could not send the verification code");

    return {
      success: true,
      ...(bypass ? { devCode: code } : {}),
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
