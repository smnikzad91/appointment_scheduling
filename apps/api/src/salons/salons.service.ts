import { Injectable, NotFoundException } from "@nestjs/common";
import { SalonStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { UpdateSalonDto } from "./dto/update-salon.dto.js";
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
        stylists: { where: { active: true }, include: { workingHours: true, services: true } },
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
    return this.prisma.salon.update({ where: { id: salon.id }, data: dto });
  }

  // --- platform-admin moderation ---

  listForAdmin(status?: SalonStatus) {
    return this.prisma.salon.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  async setStatus(id: string, dto: UpdateSalonStatusDto) {
    const salon = await this.prisma.salon.findUnique({ where: { id } });
    if (!salon) throw new NotFoundException("Salon not found");
    return this.prisma.salon.update({ where: { id }, data: { status: dto.status } });
  }
}
