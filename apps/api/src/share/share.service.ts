import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SalonStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { generatedStylistHandle, handleProblem, normalizeHandle } from "./share-handle.util.js";

/** Where a short link points: the salon's page, and for a stylist's link, that stylist. */
export interface ResolvedHandle {
  slug: string;
  stylistId: string | null;
}

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: nobatet.app/book/@<handle> → the (active) salon page, or a stylist's booking. */
  async resolve(raw: string): Promise<ResolvedHandle> {
    const handle = normalizeHandle(raw);
    if (!handle) throw new NotFoundException("Link not found");
    const salon = await this.prisma.salon.findFirst({
      where: { OR: [{ handle }, { slug: handle }], status: SalonStatus.ACTIVE },
      // an explicit handle wins over another salon's identical slug
      orderBy: { handle: { sort: "asc", nulls: "last" } },
      select: { slug: true },
    });
    if (salon) return { slug: salon.slug, stylistId: null };
    const stylist = await this.prisma.stylist.findFirst({
      where: { handle, active: true, salon: { status: SalonStatus.ACTIVE } },
      select: { id: true, salon: { select: { slug: true } } },
    });
    if (stylist) return { slug: stylist.salon.slug, stylistId: stylist.id };
    throw new NotFoundException("Link not found");
  }

  async setSalonHandle(userId: string, raw: string) {
    const salon = await this.prisma.salon.findFirst({ where: { ownerId: userId }, select: { id: true } });
    if (!salon) throw new NotFoundException("You don't own a salon yet");
    const handle = await this.assertAvailable(raw, { salonId: salon.id });
    return this.saveUnique(() => this.prisma.salon.update({ where: { id: salon.id }, data: { handle }, select: { handle: true, slug: true } }));
  }

  /** The stylist's handle, given a generated one the first time (so they always have a link). */
  async stylistHandle(userId: string) {
    const stylist = await this.prisma.stylist.findUnique({ where: { userId }, select: { id: true, handle: true } });
    if (!stylist) throw new NotFoundException("No stylist profile for this account");
    if (stylist.handle) return { handle: stylist.handle };
    for (let attempt = 0; attempt < 8; attempt++) {
      const handle = generatedStylistHandle();
      if (await this.taken(handle, { stylistId: stylist.id })) continue;
      try {
        return await this.prisma.stylist.update({ where: { id: stylist.id }, data: { handle }, select: { handle: true } });
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      }
    }
    throw new ConflictException("This handle is taken");
  }

  async setStylistHandle(userId: string, raw: string) {
    const stylist = await this.prisma.stylist.findUnique({ where: { userId }, select: { id: true } });
    if (!stylist) throw new NotFoundException("No stylist profile for this account");
    const handle = await this.assertAvailable(raw, { stylistId: stylist.id });
    return this.saveUnique(() => this.prisma.stylist.update({ where: { id: stylist.id }, data: { handle }, select: { handle: true } }));
  }

  private async assertAvailable(raw: string, self: { salonId?: string; stylistId?: string }) {
    const handle = normalizeHandle(raw);
    const problem = handleProblem(handle);
    if (problem) throw new BadRequestException(problem);
    if (await this.taken(handle, self)) throw new ConflictException("This handle is taken");
    return handle;
  }

  /** Taken by anyone else: another salon's handle or slug, or another stylist's handle. */
  private async taken(handle: string, self: { salonId?: string; stylistId?: string }) {
    const [salon, stylist] = await Promise.all([
      this.prisma.salon.findFirst({ where: { OR: [{ handle }, { slug: handle }], ...(self.salonId && { id: { not: self.salonId } }) }, select: { id: true } }),
      this.prisma.stylist.findFirst({ where: { handle, ...(self.stylistId && { id: { not: self.stylistId } }) }, select: { id: true } }),
    ]);
    return !!(salon || stylist);
  }

  /** Two people claiming the same handle at once: the unique index lets only one through. */
  private async saveUnique<T>(save: () => Promise<T>): Promise<T> {
    try {
      return await save();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new ConflictException("This handle is taken");
      throw err;
    }
  }
}
