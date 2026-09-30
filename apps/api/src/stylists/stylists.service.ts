import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Role, SalonKind } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { assertOwnsSalon } from "../salons/salon-ownership.util.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";
import { issueSetupToken, unusablePassword } from "../auth/password-setup.util.js";
import {
  InviteStylistDto,
  UpdateStylistDto,
  SetStylistServicesDto,
  StylistServiceEntryDto,
  UpdateOwnStylistDto,
  UpdateStylistServiceOverrideDto,
  WorkingHourEntryDto,
  CreateTimeOffDto,
} from "./dto/stylist.dto.js";

/** A new stylist's share of their appointments' income unless the owner picks another. */
const DEFAULT_COMMISSION_PERCENT = 20;

@Injectable()
export class StylistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salonsService: SalonsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async listMine(userId: string) {
    const salon = await this.salonsService.findMine(userId);
    return this.prisma.stylist.findMany({
      where: { salonId: salon.id },
      include: { user: { select: { firstName: true, lastName: true, phone: true, mustSetPassword: true } }, services: true },
    });
  }

  async invite(userId: string, dto: InviteStylistDto) {
    const salon = await this.salonsService.findMine(userId);
    if (salon.kind === SalonKind.INDEPENDENT) throw new ForbiddenException("An independent stylist works alone and can't add stylists");
    await this.subscriptions.assertCanAddStylist(salon.id);

    const existingUser = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existingUser) {
      if (existingUser.role !== Role.STYLIST) {
        throw new ConflictException("This phone number belongs to an existing account that isn't a stylist");
      }
      const existingStylist = await this.prisma.stylist.findUnique({ where: { userId: existingUser.id } });
      if (existingStylist) {
        throw new ConflictException(
          existingStylist.salonId === salon.id
            ? "This person is already a stylist at your salon"
            : "This phone number is already a stylist at another salon",
        );
      }
    }

    // Account, stylist profile and first sign-in link are created together, so a failure can't
    // leave a stylist account without a stylist (which the owner then can't see or remove).
    const { stylist, setup } = await this.prisma.$transaction(async (tx) => {
      const stylistUser =
        existingUser ??
        (await tx.user.create({
          data: {
            phone: dto.phone,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: Role.STYLIST,
            // Nobody knows this password: the stylist picks their own through the link below.
            passwordHash: await bcrypt.hash(unusablePassword(), 10),
            mustSetPassword: true,
          },
        }));
      const stylist = await tx.stylist.create({
        data: {
          userId: stylistUser.id,
          salonId: salon.id,
          displayName: dto.displayName,
          bio: dto.bio,
          commissionPercent: dto.commissionPercent ?? DEFAULT_COMMISSION_PERCENT,
        },
      });
      // An existing stylist account that already has its own password needs no link.
      const setup = stylistUser.mustSetPassword ? await issueSetupToken(tx, stylistUser.id) : null;
      return { stylist, setup };
    });

    if (dto.serviceIds?.length) {
      await this.replaceServices(salon.id, stylist.id, dto.serviceIds.map((serviceId) => ({ serviceId })));
    }

    // setupToken is returned only here and by regenerateSetupLink — the owner shares the link
    // (/set-password/<token>) with the stylist, who then chooses their own password.
    return { ...stylist, setupToken: setup?.setupToken, setupExpiresAt: setup?.expiresAt };
  }

  /**
   * A new one-time "set your password" link for one of the owner's stylists — the first one got
   * lost, expired, or the stylist forgot their password. Any earlier unused link stops working.
   */
  async regenerateSetupLink(userId: string, stylistId: string) {
    const stylist = await this.findOwned(userId, stylistId);
    // An independent stylist's profile is their own account, which already has a password.
    if (stylist.userId === userId) throw new ForbiddenException("This is your own account");
    return this.prisma.$transaction((tx) => issueSetupToken(tx, stylist.userId));
  }

  async update(userId: string, stylistId: string, dto: UpdateStylistDto) {
    const stylist = await this.findOwned(userId, stylistId);
    // An independent stylist is their business's only stylist: never switched off, and with no
    // salon to share the money with, their commission stays 0% (the whole amount is their income).
    if (stylist.userId === userId && (dto.active === false || (dto.commissionPercent !== undefined && dto.commissionPercent !== 0))) {
      throw new ForbiddenException("Your own stylist profile can't be deactivated or given a commission");
    }
    // Re-activating a stylist takes a seat on the plan like adding one.
    if (dto.active === true && !stylist.active) await this.subscriptions.assertCanAddStylist(stylist.salonId);
    const [updated] = await this.prisma.$transaction([
      this.prisma.stylist.update({ where: { id: stylist.id }, data: dto }),
      ...this.syncAccountAvatar(stylist.userId, dto.avatarUrl),
    ]);
    return updated;
  }

  /**
   * A stylist's profile photo is also their account photo (shown in the panel's app bar and
   * returned at login), so keep User.avatarUrl in step when the stylist photo changes.
   */
  private syncAccountAvatar(stylistUserId: string, avatarUrl: string | null | undefined) {
    if (avatarUrl === undefined) return [];
    return [this.prisma.user.update({ where: { id: stylistUserId }, data: { avatarUrl } })];
  }

  async setServices(userId: string, stylistId: string, dto: SetStylistServicesDto) {
    const stylist = await this.findOwned(userId, stylistId);
    await this.replaceServices(stylist.salonId, stylist.id, dto.services);
    return this.prisma.stylist.findUnique({ where: { id: stylist.id }, include: { services: true } });
  }

  private async replaceServices(salonId: string, stylistId: string, entries: StylistServiceEntryDto[]) {
    const serviceIds = entries.map((e) => e.serviceId);
    if (serviceIds.length > 0) {
      const validCount = await this.prisma.service.count({ where: { id: { in: serviceIds }, salonId } });
      if (validCount !== serviceIds.length) {
        throw new BadRequestException("One or more services don't belong to this salon");
      }
    }

    await this.prisma.$transaction([
      this.prisma.stylistService.deleteMany({ where: { stylistId } }),
      this.prisma.stylistService.createMany({
        data: entries.map((e) => ({
          stylistId,
          serviceId: e.serviceId,
          overridePriceToman: e.overridePriceToman ?? undefined,
          overrideDurationMinutes: e.overrideDurationMinutes ?? undefined,
          commissionPercent: e.commissionPercent ?? undefined,
        })),
      }),
    ]);
  }

  private async findOwned(userId: string, stylistId: string) {
    const stylist = await this.prisma.stylist.findUnique({ where: { id: stylistId } });
    if (!stylist) throw new NotFoundException("Stylist not found");
    await assertOwnsSalon(this.prisma, stylist.salonId, userId);
    return stylist;
  }

  // --- stylist self-service (the logged-in stylist managing their own profile/schedule) ---

  async findMe(userId: string) {
    const stylist = await this.prisma.stylist.findUnique({
      where: { userId },
      include: {
        workingHours: true,
        services: { include: { service: true } },
        salon: { select: { slug: true, timezone: true, status: true } },
      },
    });
    if (!stylist) throw new NotFoundException("No stylist profile for this account");
    return stylist;
  }

  async updateOwn(userId: string, dto: UpdateOwnStylistDto) {
    const stylist = await this.findMe(userId);
    const [updated] = await this.prisma.$transaction([
      this.prisma.stylist.update({
        where: { id: stylist.id },
        data: dto,
        include: { workingHours: true, services: { include: { service: true } } },
      }),
      ...this.syncAccountAvatar(userId, dto.avatarUrl),
    ]);
    return updated;
  }

  async updateOwnServiceOverride(userId: string, serviceId: string, dto: UpdateStylistServiceOverrideDto) {
    const stylist = await this.findMe(userId);
    const existing = await this.prisma.stylistService.findUnique({
      where: { stylistId_serviceId: { stylistId: stylist.id, serviceId } },
    });
    if (!existing) throw new NotFoundException("You don't offer this service");

    return this.prisma.stylistService.update({
      where: { stylistId_serviceId: { stylistId: stylist.id, serviceId } },
      data: {
        overridePriceToman: dto.overridePriceToman,
        overrideDurationMinutes: dto.overrideDurationMinutes,
        overrideRebookReminderEnabled: dto.overrideRebookReminderEnabled,
        overrideRebookReminderDays: dto.overrideRebookReminderDays,
      },
      include: { service: true },
    });
  }

  async setOwnWorkingHours(userId: string, entries: WorkingHourEntryDto[]) {
    const stylist = await this.findMe(userId);

    for (const entry of entries) {
      if (entry.startMinute >= entry.endMinute) {
        throw new BadRequestException(`startMinute must be before endMinute for dayOfWeek ${entry.dayOfWeek}`);
      }
    }
    const days = entries.map((e) => e.dayOfWeek);
    if (new Set(days).size !== days.length) {
      throw new BadRequestException("Each dayOfWeek can only appear once");
    }

    await this.prisma.$transaction([
      this.prisma.workingHour.deleteMany({ where: { stylistId: stylist.id } }),
      this.prisma.workingHour.createMany({
        data: entries.map((e) => ({
          stylistId: stylist.id,
          dayOfWeek: e.dayOfWeek,
          startMinute: e.startMinute,
          endMinute: e.endMinute,
        })),
      }),
    ]);

    return this.prisma.workingHour.findMany({ where: { stylistId: stylist.id }, orderBy: { dayOfWeek: "asc" } });
  }

  async listOwnTimeOff(userId: string) {
    const stylist = await this.findMe(userId);
    return this.prisma.timeOff.findMany({ where: { stylistId: stylist.id }, orderBy: { startAt: "asc" } });
  }

  async createOwnTimeOff(userId: string, dto: CreateTimeOffDto) {
    const stylist = await this.findMe(userId);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (startAt >= endAt) {
      throw new BadRequestException("startAt must be before endAt");
    }
    return this.prisma.timeOff.create({ data: { stylistId: stylist.id, startAt, endAt, reason: dto.reason } });
  }

  async removeOwnTimeOff(userId: string, timeOffId: string) {
    const stylist = await this.findMe(userId);
    const timeOff = await this.prisma.timeOff.findUnique({ where: { id: timeOffId } });
    if (!timeOff) throw new NotFoundException("Time off not found");
    if (timeOff.stylistId !== stylist.id) throw new ForbiddenException("Not your time off");
    await this.prisma.timeOff.delete({ where: { id: timeOffId } });
    return { ok: true };
  }
}
