import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ReviewStatus, ReviewTarget } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { CreateReviewDto, ModerateReviewDto } from "./dto/create-review.dto.js";

const MODERATION_INCLUDE = {
  appointment: {
    select: {
      startAt: true,
      customer: { select: { firstName: true, lastName: true } },
      services: { select: { service: { select: { name: true } } } },
    },
  },
  stylist: { select: { id: true, displayName: true } },
} satisfies Prisma.ReviewInclude;

type ModerationRow = Prisma.ReviewGetPayload<{ include: typeof MODERATION_INCLUDE }>;

/** "مریم ر." — enough to feel real on a public page without publishing a customer's full name. */
function publicName(firstName: string, lastName: string) {
  const initial = lastName.trim().charAt(0);
  return initial ? `${firstName} ${initial}.` : firstName;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salonsService: SalonsService,
  ) {}

  // ── Customer ─────────────────────────────────────────────────────────────

  async create(customerId: string, appointmentId: string, dto: CreateReviewDto) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException("Appointment not found");
    if (appointment.customerId !== customerId) throw new ForbiddenException("Not your appointment");
    if (appointment.status !== "COMPLETED") {
      throw new BadRequestException("You can only review a completed appointment");
    }

    const target = dto.target ?? ReviewTarget.SALON;
    try {
      return await this.prisma.review.create({
        data: {
          appointmentId,
          salonId: appointment.salonId,
          target,
          stylistId: target === ReviewTarget.STYLIST ? appointment.stylistId : null,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
        },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002") {
        throw new ConflictException("This appointment has already been reviewed");
      }
      throw err;
    }
  }

  // ── Public ───────────────────────────────────────────────────────────────

  /** Approved reviews of the salon and of its stylists, newest first. */
  async listForSalon(slug: string) {
    const salon = await this.salonsService.findPublicBySlug(slug);
    if (!salon) throw new NotFoundException("Salon not found");

    const reviews = await this.prisma.review.findMany({
      where: { salonId: salon.id, status: ReviewStatus.APPROVED },
      orderBy: { createdAt: "desc" },
      include: { appointment: { select: { customer: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
    });

    return reviews.map((r) => ({
      id: r.id,
      target: r.target,
      stylistId: r.stylistId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      customer: {
        firstName: publicName(r.appointment.customer.firstName, r.appointment.customer.lastName),
        avatarUrl: r.appointment.customer.avatarUrl,
      },
    }));
  }

  // ── Moderation (salon owner: every review of the salon; stylist: reviews about them) ──

  async listForOwner(userId: string, status?: ReviewStatus) {
    const salon = await this.salonsService.findMine(userId);
    return this.listForModeration({ salonId: salon.id }, status);
  }

  async listForStylist(userId: string, status?: ReviewStatus) {
    const stylist = await this.prisma.stylist.findUnique({ where: { userId }, select: { id: true } });
    if (!stylist) throw new NotFoundException("Stylist profile not found");
    return this.listForModeration({ stylistId: stylist.id, target: ReviewTarget.STYLIST }, status);
  }

  async moderate(userId: string, reviewId: string, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { salon: { select: { ownerId: true } }, stylist: { select: { userId: true } } },
    });
    if (!review) throw new NotFoundException("Review not found");
    const isOwner = review.salon.ownerId === userId;
    const isReviewedStylist = review.target === ReviewTarget.STYLIST && review.stylist?.userId === userId;
    if (!isOwner && !isReviewedStylist) throw new ForbiddenException("Not your review");

    const updated = await this.prisma.review.update({
      where: { id: review.id },
      data: { status: dto.status, moderatedAt: new Date() },
      include: MODERATION_INCLUDE,
    });
    return this.toModerationView(updated);
  }

  private async listForModeration(where: Prisma.ReviewWhereInput, status?: ReviewStatus) {
    const rows = await this.prisma.review.findMany({
      where: { ...where, ...(status && { status }) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: MODERATION_INCLUDE,
    });
    return rows.map((r) => this.toModerationView(r));
  }

  private toModerationView(r: ModerationRow) {
    return {
      id: r.id,
      target: r.target,
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt,
      moderatedAt: r.moderatedAt,
      stylist: r.stylist,
      customerName: `${r.appointment.customer.firstName} ${r.appointment.customer.lastName}`.trim(),
      appointment: { startAt: r.appointment.startAt, services: r.appointment.services.map((s) => s.service.name) },
    };
  }
}
