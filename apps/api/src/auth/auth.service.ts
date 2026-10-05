import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomInt } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Role, SalonKind, SalonStatus, User } from "@appointment-scheduling/database";
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
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";
import { otpDomain, otpText } from "../sms/sms.text.js";

export interface JwtPayload {
  sub: string;
  role: Role;
}

const DEFAULT_AVATAR_COUNT = 37;
const OTP_LENGTH = 5;
const OTP_TTL_MINUTES = 5;
// Per-phone throttle, so one number can't burn the SMS key's quota (30/min) or balance.
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_PER_HOUR = 5;
// Tries per code — with the throttle, at most 25 guesses an hour at a 5-digit code.
const OTP_MAX_ATTEMPTS = 5;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // Every new account proves its phone first: the sign-up forms ask for an SMS code
  // (requestOtp purpose "register") and send it with the rest; it's checked and used up right
  // before the account is created. Accounts made by signing in with a code are verified already.

  async register(dto: RegisterDto) {
    await this.assertIdentifierAvailable(dto.phone, dto.email);
    await this.useOtp(dto.phone, dto.code);

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

    const independent = dto.kind === SalonKind.INDEPENDENT;
    if (independent && !dto.serviceLocations?.length) throw new BadRequestException("Choose where you work");

    await this.useOtp(dto.phone, dto.code);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const slug = await generateUniqueSlug(this.prisma, dto.salonName);
    const subscription = await this.subscriptions.initialFor(dto.planId);

    const user = await this.prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          phone: dto.phone,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: independent ? Role.INDEPENDENT_STYLIST : Role.SALON_OWNER,
          avatarUrl: randomDefaultAvatar(),
        },
      });

      const salon = await tx.salon.create({
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
          ...subscription,
          ...(independent && {
            kind: SalonKind.INDEPENDENT,
            serviceLocations: dto.serviceLocations,
            serviceArea: dto.serviceArea ?? null,
            hostSalonName: dto.hostSalonName ?? null,
          }),
        },
      });

      // An independent stylist is their business's only stylist. Commission 0%: with no salon to
      // share with, the whole amount is their own income (see accounting).
      if (independent) {
        await tx.stylist.create({
          data: {
            userId: owner.id,
            salonId: salon.id,
            displayName: `${dto.firstName} ${dto.lastName}`.trim(),
            commissionPercent: 0,
          },
        });
      }

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
   * The SMS code for a one-time link: sent to the account's own phone (the number the owner
   * entered), so whoever opened the link must also hold that phone. Staff numbers included — the
   * link already identifies the account. Same throttle as every code.
   */
  async sendPasswordSetupCode(token: string) {
    const setup = await this.findUsableSetupToken(token);
    if (!setup.user.phone) throw new BadRequestException("This account has no phone number");
    return this.sendOtp(setup.user.phone, false);
  }

  /**
   * Sets the password through a one-time link and burns the link. The account's phone must be
   * confirmed with an SMS code first (sendPasswordSetupCode). Returns the phone number so the web
   * app can sign the stylist straight in with it.
   */
  async completePasswordSetup(dto: CompletePasswordSetupDto) {
    const setup = await this.findUsableSetupToken(dto.token);
    if (setup.user.phone) await this.useOtp(setup.user.phone, dto.code ?? "");
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
   * while the bypass is on; it ends by itself once SMS_DRIVER=provider. Because the code is handed
   * to whoever asks, the bypass only ever signs in customers (or creates new ones): staff and admin
   * accounts sign in with their password until codes really go out by SMS. */
  async requestOtp(phone: string, purpose: "login" | "register" = "login") {
    if (purpose === "register") {
      // verifying a phone for a new account: say now if it's taken, before spending an SMS
      if (await this.prisma.user.findUnique({ where: { phone }, select: { id: true } })) throw new ConflictException("Phone number already registered");
      return this.sendOtp(phone, false);
    }
    return this.sendOtp(phone, true);
  }

  /** `customersOnly`: under the bypass the code is handed back, so it may only sign in customers. */
  private async sendOtp(phone: string, customersOnly: boolean) {
    const bypass = this.otpBypass();
    if (bypass && customersOnly) await this.assertCustomerOrNew(phone);
    await this.assertOtpNotThrottled(phone);

    const code = randomOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    await this.prisma.otpCode.create({ data: { phone, code, expiresAt } });

    const sent = await this.sms.send({ kind: "otp", to: phone, params: { code, domain: otpDomain() }, text: otpText(code) });
    if (!sent && !bypass) throw new ServiceUnavailableException("Could not send the verification code");

    return {
      success: true,
      ...(bypass ? { devCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    // Only the phone's latest code counts.
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone: dto.phone, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) {
      throw new UnauthorizedException("Invalid or expired code");
    }

    // Codes issued before this check existed could still be for a staff number.
    if (this.otpBypass()) await this.assertCustomerOrNew(dto.phone);

    // Each try is counted atomically before comparing, so parallel guesses can't exceed the limit.
    const tried = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, attempts: { lt: OTP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (tried.count === 0 || otp.code !== dto.code) {
      throw new UnauthorizedException("Invalid or expired code");
    }

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    // Checked before the code is used up: signing in (no name given) with a phone that has no
    // account — the panels' sign-in page — says so instead of creating one.
    const { firstName, lastName } = dto;
    if (!user && (!firstName || !lastName)) {
      throw new NotFoundException("No account with this phone number");
    }

    // Conditional, so the same code can't be used twice concurrently.
    const claimed = await this.prisma.otpCode.updateMany({ where: { id: otp.id, consumed: false }, data: { consumed: true } });
    if (claimed.count === 0) {
      throw new UnauthorizedException("Invalid or expired code");
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          firstName: firstName!,
          lastName: lastName!,
          role: Role.CUSTOMER,
          passwordHash: await bcrypt.hash(randomPassword(), 10),
          avatarUrl: randomDefaultAvatar(),
        },
      });
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Checks the phone's latest code and uses it up (sign-up, password links). Same rules as sign-in:
   * 5 tries per code, counted atomically, and a code works once.
   */
  private async useOtp(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw new UnauthorizedException("Invalid or expired code");
    const tried = await this.prisma.otpCode.updateMany({ where: { id: otp.id, attempts: { lt: OTP_MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } });
    if (tried.count === 0 || otp.code !== code) throw new UnauthorizedException("Invalid or expired code");
    const claimed = await this.prisma.otpCode.updateMany({ where: { id: otp.id, consumed: false }, data: { consumed: true } });
    if (claimed.count === 0) throw new UnauthorizedException("Invalid or expired code");
  }

  private async assertOtpNotThrottled(phone: string) {
    const recent = await this.prisma.otpCode.findMany({
      where: { phone, createdAt: { gt: new Date(Date.now() - 60 * 60_000) } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const secondsSinceLast = recent.length ? (Date.now() - recent[0].createdAt.getTime()) / 1000 : Infinity;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS || recent.length >= OTP_MAX_PER_HOUR) {
      throw new HttpException("Too many code requests, try again later", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** Codes are returned in the response instead of (or besides) being texted — see requestOtp. */
  private otpBypass(): boolean {
    return process.env.NODE_ENV !== "production" || !this.sms.delivers;
  }

  private async assertCustomerOrNew(phone: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone }, select: { role: true } });
    if (existing && existing.role !== Role.CUSTOMER) {
      throw new ForbiddenException("Staff accounts sign in with their password");
    }
  }

  /**
   * The signed-in account as it is now (GET /auth/me): the Android app reads its role at start to
   * pick the panel, and apps/web uses it to accept the app's token on its own routes. A token of an
   * account that no longer exists is refused. `role` is the current one, which may differ from the
   * token's (e.g. after an account was turned into an independent stylist) — sign in again then.
   */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new UnauthorizedException("Account not found");
    return this.publicUser(user);
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return { accessToken: this.jwt.sign(payload), user: this.publicUser(user) };
  }
}
