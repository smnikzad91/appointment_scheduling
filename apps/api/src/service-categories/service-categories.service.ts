import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { assertOwnsSalon } from "../salons/salon-ownership.util.js";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto.js";

@Injectable()
export class ServiceCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salonsService: SalonsService,
  ) {}

  async listMine(userId: string) {
    const salon = await this.salonsService.findMine(userId);
    return this.prisma.serviceCategory.findMany({ where: { salonId: salon.id }, orderBy: { order: "asc" } });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    const salon = await this.salonsService.findMine(userId);
    return this.prisma.serviceCategory.create({
      data: { salonId: salon.id, name: dto.name, order: dto.order ?? 0 },
    });
  }

  async update(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.findOwned(userId, categoryId);
    return this.prisma.serviceCategory.update({ where: { id: category.id }, data: dto });
  }

  async remove(userId: string, categoryId: string) {
    const category = await this.findOwned(userId, categoryId);
    // Services referencing this category keep existing (categoryId becomes null) rather than being deleted.
    await this.prisma.service.updateMany({ where: { categoryId: category.id }, data: { categoryId: null } });
    await this.prisma.serviceCategory.delete({ where: { id: category.id } });
    return { ok: true };
  }

  private async findOwned(userId: string, categoryId: string) {
    const category = await this.prisma.serviceCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException("Category not found");
    await assertOwnsSalon(this.prisma, category.salonId, userId);
    return category;
  }
}
