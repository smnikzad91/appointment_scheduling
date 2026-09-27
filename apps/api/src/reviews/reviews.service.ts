import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, Prisma, ReviewStatus, ReviewTarget } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { CreateReviewDto, ModerateReviewDto, UpdateReviewDto } from "./dto/create-review.dto.js";

const EXCERPT_LENGTH = 120;

/** What the customer sees about their own review (bookings list, edit sheet). */
const OWN_REVIEW_SELECT = { id: true, target: true, rating: true, comment: true, status: true } as const;

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
    private readonly notifications: NotificationsService,
  ) {}

  // ── Customer ─────────────────────────────────────────────────────────────

  async create(customerId: string, appointmentId: string, dto: CreateReviewDto) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException("Appointment not found");
    if (appointment.customerId !== customerId) throw new ForbiddenException("Not your appointment");
    if (appointment.status !== "COMPLETED") {
      throw new BadRequestException("You can only review a completed appointment");
    }

    const comment = dto.comment?.trim() || null;
    const rating = dto.rating ?? null;
    if (rating === null && comment === null) throw new BadRequestException("A review needs a rating or a comment");

    const target = dto.target ?? ReviewTarget.SALON;
    let review;
    try {
      review = await this.prisma.review.create({
        data: {
          appointmentId,
          salonId: appointment.salonId,
          target,
          stylistId: target === ReviewTarget.STYLIST ? appointment.stylistId : null,
          rating,
          comment,
        },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002") {
        throw new ConflictException("This appointment has already been reviewed");
      }
      throw err;
    }
    await this.notifyModerators(review.id, false);
    return review;
  }

  /**
   * The customer edits their own review. The new text hasn't been seen by the salon, so it goes
   * back to PENDING (an approved review can't be swapped for different text behind the owner's back).
   * `null` clears the rating or comment; a review still needs one of the two.
   */
  async updateOwn(customerId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.findOwn(customerId, reviewId);
    const rating = dto.rating === undefined ? review.rating : dto.rating;
    const comment = dto.comment === undefined ? review.comment : dto.comment?.trim() || null;
    if (rating === null && comment === null) throw new BadRequestException("A review needs a rating or a comment");

    const updated = await this.prisma.review.update({
      where: { id: review.id },
      data: { rating, comment, status: ReviewStatus.PENDING, moderatedAt: null },
      select: OWN_REVIEW_SELECT,
    });
    await this.notifyModerators(review.id, true);
    return updated;
  }

  async removeOwn(customerId: string, reviewId: string) {
    const review = await this.findOwn(customerId, reviewId);
    await this.prisma.review.delete({ where: { id: review.id } });
    return { ok: true };
  }

  private async findOwn(customerId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { appointment: { select: { customerId: true } } },
    });
    if (!review) throw new NotFoundException("Review not found");
    if (review.appointment.customerId !== customerId) throw new ForbiddenException("Not your review");
    return review;
  }

  /** Tell whoever can approve the review — the salon owner, and the stylist if it's about them. */
  private async notifyModerators(reviewId: string, edited: boolean) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        salon: { select: { ownerId: true } },
        stylist: { select: { userId: true, displayName: true } },
        appointment: { select: { customer: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!review) return;
    const recipients = [review.salon.ownerId];
    if (review.target === ReviewTarget.STYLIST && review.stylist) recipients.push(review.stylist.userId);
    const { firstName, lastName } = review.appointment.customer;
    await this.notifications.notify(recipients, NotificationType.NEW_REVIEW, {
      reviewId: review.id,
      target: review.target,
      rating: review.rating,
      excerpt: review.comment ? review.comment.slice(0, EXCERPT_LENGTH) : null,
      customerName: publicName(firstName, lastName),
      stylistName: review.stylist?.displayName ?? null,
      edited,
    });
  }

  // ── Public ───────────────────────────────────────────────────────────────

  /** Approved reviews of the salon and of its stylists, newest first. */
  async listForSalon(slug: string) {
    // Only the id is needed — don't load the salon's services, stylists and gallery for this.
    const salon = await this.prisma.salon.findFirst({ where: { slug, status: "ACTIVE" }, select: { id: true } });
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
