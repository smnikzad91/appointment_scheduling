import { Injectable, NotFoundException } from "@nestjs/common";
import { SalonStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonSearchService } from "../salons/salon-search.service.js";

/** A signed-in user's saved salons. Hidden/suspended salons stay saved but aren't listed. */
@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SalonSearchService,
  ) {}

  async list(userId: string) {
    const rows = await this.prisma.favoriteSalon.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { salonId: true } });
    return this.search.cards(rows.map((r) => r.salonId));
  }

  /** Just the ids — for heart buttons on search results and salon pages. */
  async ids(userId: string) {
    const rows = await this.prisma.favoriteSalon.findMany({ where: { userId }, select: { salonId: true } });
    return rows.map((r) => r.salonId);
  }

  async add(userId: string, salonId: string) {
    const salon = await this.prisma.salon.findFirst({ where: { id: salonId, status: SalonStatus.ACTIVE }, select: { id: true } });
    if (!salon) throw new NotFoundException("Salon not found");
    await this.prisma.favoriteSalon.upsert({
      where: { userId_salonId: { userId, salonId } },
      create: { userId, salonId },
      update: {},
    });
    return { ok: true };
  }

  async remove(userId: string, salonId: string) {
    await this.prisma.favoriteSalon.deleteMany({ where: { userId, salonId } });
    return { ok: true };
  }
}
