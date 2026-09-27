import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Role } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { assertOwnsSalon } from "../salons/salon-ownership.util.js";
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

function randomTempPassword(): string {
  return Math.random().toString(36).slice(2, 10) + "A1";
}

@Injectable()
export class StylistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salonsService: SalonsService,
  ) {}

  async listMine(userId: string) {
    const salon = await this.salonsService.findMine(userId);
    return this.prisma.stylist.findMany({
      where: { salonId: salon.id },
      include: { user: { select: { firstName: true, lastName: true, phone: true } }, services: true },
    });
  }

  async invite(userId: string, dto: InviteStylistDto) {
    const salon = await this.salonsService.findMine(userId);

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

    let tempPassword: string | undefined;
    let stylistUser = existingUser;
    if (!stylistUser) {
      tempPassword = randomTempPassword();
      stylistUser = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: Role.STYLIST,
          passwordHash: await bcrypt.hash(tempPassword, 10),
        },
      });
    }

    const stylist = await this.prisma.stylist.create({
      data: {
        userId: stylistUser.id,
        salonId: salon.id,
        displayName: dto.displayName,
        bio: dto.bio,
      },
    });

    if (dto.serviceIds?.length) {
      await this.replaceServices(salon.id, stylist.id, dto.serviceIds.map((serviceId) => ({ serviceId })));
    }

    // tempPassword is only present (and only ever returned this once) when a brand-new
    // account was created for this phone number — share it with the stylist out of band.
    return { ...stylist, tempPassword };
  }

  async update(userId: string, stylistId: string, dto: UpdateStylistDto) {
    const stylist = await this.findOwned(userId, stylistId);
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
      include: { workingHours: true, services: { include: { service: true } } },
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
      data: { overridePriceToman: dto.overridePriceToman, overrideDurationMinutes: dto.overrideDurationMinutes },
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
