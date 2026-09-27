import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { CreateGalleryImageDto, UpdateGalleryImageDto } from "./dto/gallery.dto.js";

export const MAX_SALON_GALLERY = 60;
export const MAX_STYLIST_GALLERY = 30;

const WITH_STYLIST = { stylist: { select: { id: true, displayName: true } } } as const;

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salonsService: SalonsService,
  ) {}

  // ── Salon owner: the whole salon gallery ──────────────────────────────────

  async listForOwner(userId: string) {
    const salon = await this.salonsService.findMine(userId);
    return this.prisma.galleryImage.findMany({ where: { salonId: salon.id }, orderBy: { createdAt: "desc" }, include: WITH_STYLIST });
  }

  async addForOwner(userId: string, dto: CreateGalleryImageDto) {
    const salon = await this.salonsService.findMine(userId);
    if (dto.stylistId) await this.assertStylistInSalon(dto.stylistId, salon.id);
    await this.assertRoom({ salonId: salon.id }, MAX_SALON_GALLERY);
    return this.prisma.galleryImage.create({
      data: { salonId: salon.id, stylistId: dto.stylistId || null, url: dto.url, caption: dto.caption?.trim() || null },
      include: WITH_STYLIST,
    });
  }

  // ── Stylist: their own portfolio ──────────────────────────────────────────

  async listForStylist(userId: string) {
    const stylist = await this.findStylist(userId);
    return this.prisma.galleryImage.findMany({ where: { stylistId: stylist.id }, orderBy: { createdAt: "desc" }, include: WITH_STYLIST });
  }

  async addForStylist(userId: string, dto: CreateGalleryImageDto) {
    const stylist = await this.findStylist(userId);
    await this.assertRoom({ stylistId: stylist.id }, MAX_STYLIST_GALLERY);
    await this.assertRoom({ salonId: stylist.salonId }, MAX_SALON_GALLERY);
    return this.prisma.galleryImage.create({
      data: { salonId: stylist.salonId, stylistId: stylist.id, url: dto.url, caption: dto.caption?.trim() || null },
      include: WITH_STYLIST,
    });
  }

  // ── Shared: edit / delete one image ───────────────────────────────────────

  async update(userId: string, imageId: string, dto: UpdateGalleryImageDto) {
    const { image, asOwner } = await this.findEditable(userId, imageId);
    const data: { caption?: string | null; stylistId?: string | null } = {};
    if (dto.caption !== undefined) data.caption = dto.caption?.trim() || null;
    if (dto.stylistId !== undefined) {
      if (!asOwner) throw new ForbiddenException("Only the salon owner can change who a piece is credited to");
      if (dto.stylistId) await this.assertStylistInSalon(dto.stylistId, image.salonId);
      data.stylistId = dto.stylistId || null;
    }
    return this.prisma.galleryImage.update({ where: { id: image.id }, data, include: WITH_STYLIST });
  }

  async remove(userId: string, imageId: string) {
    const { image } = await this.findEditable(userId, imageId);
    await this.prisma.galleryImage.delete({ where: { id: image.id } });
    return { ok: true, url: image.url };
  }

  /** The salon's owner can edit any of its images; a stylist only the ones credited to them. */
  private async findEditable(userId: string, imageId: string) {
    const image = await this.prisma.galleryImage.findUnique({ where: { id: imageId }, include: { salon: { select: { ownerId: true } } } });
    if (!image) throw new NotFoundException("Image not found");
    if (image.salon.ownerId === userId) return { image, asOwner: true };
    if (image.stylistId) {
      const stylist = await this.prisma.stylist.findUnique({ where: { id: image.stylistId }, select: { userId: true } });
      if (stylist?.userId === userId) return { image, asOwner: false };
    }
    throw new ForbiddenException("Not your image");
  }

  private async findStylist(userId: string) {
    const stylist = await this.prisma.stylist.findUnique({ where: { userId } });
    if (!stylist) throw new NotFoundException("Stylist profile not found");
    return stylist;
  }

  private async assertStylistInSalon(stylistId: string, salonId: string) {
    const stylist = await this.prisma.stylist.findUnique({ where: { id: stylistId }, select: { salonId: true } });
    if (!stylist || stylist.salonId !== salonId) throw new BadRequestException("Stylist does not belong to this salon");
  }

  private async assertRoom(where: { salonId?: string; stylistId?: string }, max: number) {
    if ((await this.prisma.galleryImage.count({ where })) >= max) throw new BadRequestException("Gallery is full");
  }
}
