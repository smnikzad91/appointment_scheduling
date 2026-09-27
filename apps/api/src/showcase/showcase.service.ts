import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, ReviewStatus, ReviewTarget, SalonStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { averageRating, rankByRating, type RatingStats } from "./rating.util.js";
import { UpdateBannerDto } from "./dto/showcase.dto.js";

const BANNER_ID = "singleton";
const SETTINGS_ID = "singleton";
const DEFAULT_MIN_RATINGS = 3;
const TOP_LIMIT = 6;
const SEARCH_LIMIT = 20;
const MAX_FEATURED = 3;

const SALON_CARD = { id: true, name: true, slug: true, city: true, logoUrl: true, coverImageUrl: true, status: true } as const;
const STYLIST_CARD = {
  id: true,
  displayName: true,
  avatarUrl: true,
  coverImageUrl: true,
  active: true,
  salon: { select: { id: true, name: true, slug: true, city: true, status: true } },
} as const;

type SalonRow = Prisma.SalonGetPayload<{ select: typeof SALON_CARD }>;
type StylistRow = Prisma.StylistGetPayload<{ select: typeof STYLIST_CARD }>;

/** Only approved reviews with stars count toward ratings. */
const RATED = { status: ReviewStatus.APPROVED, rating: { not: null } } satisfies Prisma.ReviewWhereInput;

/**
 * The home page showcase: a supplier banner, up to three featured salons and three featured
 * stylists (chosen and ordered by the platform admin), and the top-rated salons and stylists
 * computed from approved reviews. Hidden/suspended salons and inactive stylists never show.
 */
@Injectable()
export class ShowcaseService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public ────────────────────────────────────────────────────────────────

  async getPublic() {
    const [banner, featuredSalons, featuredStylists, salonStats, stylistStats, minRatings] = await Promise.all([
      this.prisma.homeBanner.findUnique({ where: { id: BANNER_ID } }),
      this.prisma.featuredSalon.findMany({
        where: { salon: { status: SalonStatus.ACTIVE } },
        orderBy: { priority: "asc" },
        select: { salon: { select: SALON_CARD } },
      }),
      this.prisma.featuredStylist.findMany({
        where: { stylist: { active: true, salon: { status: SalonStatus.ACTIVE } } },
        orderBy: { priority: "asc" },
        select: { stylist: { select: STYLIST_CARD } },
      }),
      this.salonRatingStats({ status: SalonStatus.ACTIVE }),
      this.stylistRatingStats({ active: true, salon: { status: SalonStatus.ACTIVE } }),
      this.minRatings(),
    ]);

    // A single 5-star review shouldn't put a brand-new salon at the top: below the admin's
    // minimum a salon/stylist isn't ranked at all.
    const rank = (stats: Map<string, RatingStats>) =>
      rankByRating([...stats.entries()].map(([id, s]) => ({ id, ...s })), TOP_LIMIT, minRatings).map((s) => s.id);
    const topSalonIds = rank(salonStats);
    const topStylistIds = rank(stylistStats);
    const [topSalons, topStylists] = await Promise.all([
      this.prisma.salon.findMany({ where: { id: { in: topSalonIds } }, select: SALON_CARD }),
      this.prisma.stylist.findMany({ where: { id: { in: topStylistIds } }, select: STYLIST_CARD }),
    ]);
    const inOrder = <T extends { id: string }>(rows: T[], ids: string[]) => ids.flatMap((id) => rows.filter((r) => r.id === id));

    return {
      banner: banner?.active && banner.imageUrl ? { imageUrl: banner.imageUrl, linkUrl: banner.linkUrl, title: banner.title } : null,
      featuredSalons: featuredSalons.map((f) => this.salonCard(f.salon, salonStats)),
      featuredStylists: featuredStylists.map((f) => this.stylistCard(f.stylist, stylistStats)),
      topSalons: inOrder(topSalons, topSalonIds).map((s) => this.salonCard(s, salonStats)),
      topStylists: inOrder(topStylists, topStylistIds).map((s) => this.stylistCard(s, stylistStats)),
    };
  }

  // ── Platform admin ────────────────────────────────────────────────────────

  /** Everything the editor needs, including featured entries that are currently hidden. */
  async getAdmin() {
    const [banner, featuredSalons, featuredStylists, minRatings] = await Promise.all([
      this.prisma.homeBanner.findUnique({ where: { id: BANNER_ID } }),
      this.prisma.featuredSalon.findMany({ orderBy: { priority: "asc" }, select: { priority: true, salon: { select: SALON_CARD } } }),
      this.prisma.featuredStylist.findMany({ orderBy: { priority: "asc" }, select: { priority: true, stylist: { select: STYLIST_CARD } } }),
      this.minRatings(),
    ]);
    const salonStats = await this.salonRatingStats({ id: { in: featuredSalons.map((f) => f.salon.id) } });
    const stylistStats = await this.stylistRatingStats({ id: { in: featuredStylists.map((f) => f.stylist.id) } });
    return {
      banner: banner ?? { id: BANNER_ID, imageUrl: null, linkUrl: null, title: null, active: false, updatedAt: null },
      settings: { minRatings },
      featuredSalons: featuredSalons.map((f) => ({ priority: f.priority, ...this.salonCard(f.salon, salonStats), visible: f.salon.status === SalonStatus.ACTIVE })),
      featuredStylists: featuredStylists.map((f) => ({
        priority: f.priority,
        ...this.stylistCard(f.stylist, stylistStats),
        visible: f.stylist.active && f.stylist.salon.status === SalonStatus.ACTIVE,
      })),
    };
  }

  async updateBanner(dto: UpdateBannerDto) {
    const data = {
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.linkUrl !== undefined && { linkUrl: dto.linkUrl?.trim() || null }),
      ...(dto.title !== undefined && { title: dto.title?.trim() || null }),
      ...(dto.active !== undefined && { active: dto.active }),
    };
    const banner = await this.prisma.homeBanner.upsert({ where: { id: BANNER_ID }, create: { id: BANNER_ID, ...data }, update: data });
    if (banner.active && !banner.imageUrl) {
      await this.prisma.homeBanner.update({ where: { id: BANNER_ID }, data: { active: false } });
      throw new BadRequestException("Upload a banner image before turning it on");
    }
    return banner;
  }

  async updateSettings(minRatings: number) {
    await this.prisma.showcaseSettings.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID, minRatings }, update: { minRatings } });
    return { minRatings };
  }

  async setFeaturedSalons(ids: string[]) {
    const unique = this.assertList(ids);
    const found = await this.prisma.salon.findMany({ where: { id: { in: unique }, status: SalonStatus.ACTIVE }, select: { id: true } });
    if (found.length !== unique.length) throw new BadRequestException("Only active salons can be featured");
    await this.prisma.$transaction([
      this.prisma.featuredSalon.deleteMany({}),
      this.prisma.featuredSalon.createMany({ data: unique.map((salonId, i) => ({ salonId, priority: i + 1 })) }),
    ]);
    return this.getAdmin();
  }

  async setFeaturedStylists(ids: string[]) {
    const unique = this.assertList(ids);
    const found = await this.prisma.stylist.findMany({
      where: { id: { in: unique }, active: true, salon: { status: SalonStatus.ACTIVE } },
      select: { id: true },
    });
    if (found.length !== unique.length) throw new BadRequestException("Only active stylists of active salons can be featured");
    await this.prisma.$transaction([
      this.prisma.featuredStylist.deleteMany({}),
      this.prisma.featuredStylist.createMany({ data: unique.map((stylistId, i) => ({ stylistId, priority: i + 1 })) }),
    ]);
    return this.getAdmin();
  }

  /** Active salons matching a name/city, with their rating — for the featured picker. */
  async searchSalons(q?: string) {
    const term = q?.trim();
    const rows = await this.prisma.salon.findMany({
      where: {
        status: SalonStatus.ACTIVE,
        ...(term && { OR: [{ name: { contains: term, mode: "insensitive" } }, { city: { contains: term, mode: "insensitive" } }] }),
      },
      orderBy: { name: "asc" },
      take: SEARCH_LIMIT,
      select: SALON_CARD,
    });
    const stats = await this.salonRatingStats({ id: { in: rows.map((r) => r.id) } });
    return rows.map((r) => this.salonCard(r, stats));
  }

  /** Active stylists of active salons matching a stylist or salon name. */
  async searchStylists(q?: string) {
    const term = q?.trim();
    const rows = await this.prisma.stylist.findMany({
      where: {
        active: true,
        salon: { status: SalonStatus.ACTIVE },
        ...(term && {
          OR: [{ displayName: { contains: term, mode: "insensitive" } }, { salon: { name: { contains: term, mode: "insensitive" } } }],
        }),
      },
      orderBy: { displayName: "asc" },
      take: SEARCH_LIMIT,
      select: STYLIST_CARD,
    });
    const stats = await this.stylistRatingStats({ id: { in: rows.map((r) => r.id) } });
    return rows.map((r) => this.stylistCard(r, stats));
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private assertList(ids: string[]) {
    const unique = [...new Set(ids)];
    if (unique.length !== ids.length) throw new BadRequestException("Each one can be featured only once");
    if (unique.length > MAX_FEATURED) throw new BadRequestException("At most three can be featured");
    return unique;
  }

  private async minRatings() {
    const settings = await this.prisma.showcaseSettings.findUnique({ where: { id: SETTINGS_ID }, select: { minRatings: true } });
    return settings?.minRatings ?? DEFAULT_MIN_RATINGS;
  }

  private async salonRatingStats(salonWhere: Prisma.SalonWhereInput) {
    const rows = await this.prisma.review.groupBy({
      by: ["salonId"],
      where: { ...RATED, target: ReviewTarget.SALON, salon: salonWhere },
      _sum: { rating: true },
      _count: { rating: true },
    });
    return new Map<string, RatingStats>(rows.map((r) => [r.salonId, { ratingSum: r._sum.rating ?? 0, ratingCount: r._count.rating }]));
  }

  private async stylistRatingStats(stylistWhere: Prisma.StylistWhereInput) {
    const rows = await this.prisma.review.groupBy({
      by: ["stylistId"],
      where: { ...RATED, target: ReviewTarget.STYLIST, stylist: stylistWhere },
      _sum: { rating: true },
      _count: { rating: true },
    });
    return new Map<string, RatingStats>(
      rows.filter((r) => r.stylistId).map((r) => [r.stylistId as string, { ratingSum: r._sum.rating ?? 0, ratingCount: r._count.rating }]),
    );
  }

  private salonCard(s: SalonRow, stats: Map<string, RatingStats>) {
    const st = stats.get(s.id) ?? { ratingSum: 0, ratingCount: 0 };
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      city: s.city,
      logoUrl: s.logoUrl,
      coverImageUrl: s.coverImageUrl,
      rating: averageRating(st),
      ratingCount: st.ratingCount,
    };
  }

  private stylistCard(s: StylistRow, stats: Map<string, RatingStats>) {
    const st = stats.get(s.id) ?? { ratingSum: 0, ratingCount: 0 };
    return {
      id: s.id,
      displayName: s.displayName,
      avatarUrl: s.avatarUrl,
      coverImageUrl: s.coverImageUrl,
      salon: { name: s.salon.name, slug: s.salon.slug, city: s.salon.city },
      rating: averageRating(st),
      ratingCount: st.ratingCount,
    };
  }
}
