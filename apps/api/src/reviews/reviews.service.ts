import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { CreateReviewDto } from "./dto/create-review.dto.js";

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salonsService: SalonsService,
  ) {}

  async create(customerId: string, appointmentId: string, dto: CreateReviewDto) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException("Appointment not found");
    if (appointment.customerId !== customerId) throw new ForbiddenException("Not your appointment");
    if (appointment.status !== "COMPLETED") {
      throw new BadRequestException("You can only review a completed appointment");
    }

    try {
      return await this.prisma.review.create({
        data: { appointmentId, rating: dto.rating, comment: dto.comment },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002") {
        throw new ConflictException("This appointment has already been reviewed");
      }
      throw err;
    }
  }

  async listForSalon(slug: string) {
    const salon = await this.salonsService.findPublicBySlug(slug);
    if (!salon) throw new NotFoundException("Salon not found");

    const reviews = await this.prisma.review.findMany({
      where: { appointment: { salonId: salon.id } },
      orderBy: { createdAt: "desc" },
      include: { appointment: { include: { customer: { select: { firstName: true, avatarUrl: true } } } } },
    });

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      customer: r.appointment.customer,
    }));
  }
}
