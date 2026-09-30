import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { SalonKind } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { assertOwnsSalon } from "../salons/salon-ownership.util.js";
import { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto.js";

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salonsService: SalonsService,
  ) {}

  async listMine(userId: string) {
    const salon = await this.salonsService.findMine(userId);
    return this.prisma.service.findMany({ where: { salonId: salon.id }, orderBy: { createdAt: "asc" } });
  }

  async create(userId: string, dto: CreateServiceDto) {
    const salon = await this.salonsService.findMine(userId);
    await this.assertCategoryInSalon(dto.categoryId, salon.id);
    // An independent stylist offers every service of their own business: attach it to their
    // stylist profile at once (a salon owner assigns services to stylists separately).
    const soloStylist =
      salon.kind === SalonKind.INDEPENDENT ? await this.prisma.stylist.findUnique({ where: { userId }, select: { id: true } }) : null;
    return this.prisma.service.create({
      data: {
        ...(soloStylist && { stylists: { create: { stylistId: soloStylist.id } } }),
        salonId: salon.id,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        durationMinutes: dto.durationMinutes,
        priceToman: dto.priceToman,
        rebookReminderEnabled: dto.rebookReminderEnabled,
        rebookReminderDays: dto.rebookReminderDays,
      },
    });
  }

  async update(userId: string, serviceId: string, dto: UpdateServiceDto) {
    const service = await this.findOwned(userId, serviceId);
    await this.assertCategoryInSalon(dto.categoryId, service.salonId);
    return this.prisma.service.update({ where: { id: service.id }, data: dto });
  }

  async remove(userId: string, serviceId: string) {
    const service = await this.findOwned(userId, serviceId);
    // Soft-delete: existing appointments reference this service, so it can't just vanish.
    await this.prisma.service.update({ where: { id: service.id }, data: { active: false } });
    return { ok: true };
  }

  /** A service may only be filed under one of its own salon's categories (null/undefined = none). */
  private async assertCategoryInSalon(categoryId: string | null | undefined, salonId: string) {
    if (!categoryId) return;
    const category = await this.prisma.serviceCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.salonId !== salonId) {
      throw new BadRequestException("Category does not belong to this salon");
    }
  }

  private async findOwned(userId: string, serviceId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException("Service not found");
    await assertOwnsSalon(this.prisma, service.salonId, userId);
    return service;
  }
}
