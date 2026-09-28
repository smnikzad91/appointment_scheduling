import { Injectable, NotFoundException } from "@nestjs/common";
import { SalonStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { UpdateSalonDto } from "./dto/update-salon.dto.js";
import { assertIranCoordinates, resolveProvinceCity } from "../common/location.js";
import { UpdateSalonStatusDto } from "./dto/update-salon-status.dto.js";

@Injectable()
export class SalonsService {
  constructor(private readonly prisma: PrismaService) {}

  findPublicBySlug(slug: string) {
    return this.prisma.salon.findFirst({
      where: { slug, status: "ACTIVE" },
      include: {
        serviceCategories: { orderBy: { order: "asc" } },
        services: { where: { active: true } },
        // Commission rates are between the owner and the stylist — never on the public page.
        stylists: {
          where: { active: true },
          omit: { commissionPercent: true },
          include: { workingHours: true, services: { omit: { commissionPercent: true } } },
        },
        galleryImages: { orderBy: { createdAt: "desc" }, select: { id: true, url: true, caption: true, stylistId: true } },
      },
    });
  }

  listPublic() {
    return this.prisma.salon.findMany({ where: { status: "ACTIVE" } });
  }

  async findMine(userId: string) {
    const salon = await this.prisma.salon.findFirst({ where: { ownerId: userId } });
    if (!salon) throw new NotFoundException("You don't own a salon yet");
    return salon;
  }

  async updateMine(userId: string, dto: UpdateSalonDto) {
    const salon = await this.findMine(userId);
    const { province, city, ...rest } = dto;
    const location =
      province !== undefined || city !== undefined ? resolveProvinceCity(province ?? salon.province ?? "", city ?? salon.city) : {};
    assertIranCoordinates(dto.latitude, dto.longitude);
    return this.prisma.salon.update({
      where: { id: salon.id },
      data: { ...rest, ...location, ...(rest.address !== undefined && { address: rest.address.trim() }) },
    });
  }

  // --- platform-admin moderation ---

  listForAdmin(status?: SalonStatus) {
    return this.prisma.salon.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
        plan: { select: { id: true, name: true } },
      },
    });
  }

  async setStatus(id: string, dto: UpdateSalonStatusDto) {
    const salon = await this.prisma.salon.findUnique({ where: { id } });
    if (!salon) throw new NotFoundException("Salon not found");
    return this.prisma.salon.update({ where: { id }, data: { status: dto.status } });
  }
}
