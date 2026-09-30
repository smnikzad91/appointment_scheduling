import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, ReviewStatus, ReviewTarget, SalonStatus } from "@appointment-scheduling/database";
import { findProvince, normalizePlaceName } from "@appointment-scheduling/iran-locations";
import { PrismaService } from "../prisma/prisma.service.js";
import { averageRating, weightedRating, type RatingStats } from "../showcase/rating.util.js";
import { EARTH_RADIUS_KM, boundingBox } from "./geo.util.js";
import { SearchSalonsDto } from "./dto/search-salons.dto.js";
import { publicLocation } from "./public-location.util.js";

/** Candidates considered per search before sorting/paging — plenty for a province or a radius. */
const MAX_CANDIDATES = 500;
const DEFAULT_LIMIT = 20;
const SERVICE_PREVIEW = 3;

const CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  province: true,
  city: true,
  address: true,
  logoUrl: true,
  coverImageUrl: true,
  latitude: true,
  longitude: true,
  kind: true,
  serviceLocations: true,
  serviceArea: true,
  hostSalonName: true,
  services: { where: { active: true }, orderBy: { priceToman: "asc" }, select: { name: true, priceToman: true } },
} satisfies Prisma.SalonSelect;

export type SalonCardRow = Prisma.SalonGetPayload<{ select: typeof CARD_SELECT }>;

/**
 * Public salon discovery: filter ACTIVE salons by province/city and a text query, optionally
 * around the customer's position (distance in km, radius filter, nearest first), or sorted by
 * rating (the same weighted average as the home page's top-rated list).
 */
@Injectable()
export class SalonSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchSalonsDto) {
    const near = dto.lat != null && dto.lng != null ? { lat: dto.lat, lng: dto.lng } : null;
    if ((dto.lat == null) !== (dto.lng == null)) throw new BadRequestException("Send both lat and lng");
    if (!near && (dto.radiusKm != null || dto.sort === "distance")) throw new BadRequestException("Distance search needs lat and lng");
    const sort = dto.sort ?? (near ? "distance" : "rating");
    const limit = dto.limit ?? DEFAULT_LIMIT;
    const offset = dto.offset ?? 0;

    const candidates = await this.candidates(dto, near);
    const stats = await this.ratingStats(candidates.map((c) => c.id));
    const ranked =
      sort === "rating"
        ? [...candidates].sort((a, b) => {
            const sa = stats.get(a.id) ?? { ratingSum: 0, ratingCount: 0 };
            const sb = stats.get(b.id) ?? { ratingSum: 0, ratingCount: 0 };
            return (
              weightedRating(sb.ratingSum, sb.ratingCount) - weightedRating(sa.ratingSum, sa.ratingCount) ||
              sb.ratingCount - sa.ratingCount ||
              (a.km ?? 0) - (b.km ?? 0)
            );
          })
        : candidates; // already nearest first

    const page = ranked.slice(offset, offset + limit);
    const rows = await this.prisma.salon.findMany({ where: { id: { in: page.map((p) => p.id) } }, select: CARD_SELECT });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      total: ranked.length,
      /** True when more than MAX_CANDIDATES matched — narrow the search to see the rest. */
      truncated: candidates.length === MAX_CANDIDATES,
      items: page.flatMap((p) => {
        const row = byId.get(p.id);
        return row ? [toSalonCard(row, stats.get(p.id), p.km)] : [];
      }),
    };
  }

  /** Matching salon ids (and distance when searching near a point), nearest or name order. */
  private async candidates(dto: SearchSalonsDto, near: { lat: number; lng: number } | null) {
    const where: Prisma.Sql[] = [Prisma.sql`s."status" = ${SalonStatus.ACTIVE}::"SalonStatus"`];
    if (dto.province) {
      const province = findProvince(dto.province);
      if (!province) throw new BadRequestException("Unknown province");
      where.push(Prisma.sql`s."province" = ${province.name}`);
    }
    if (dto.city) where.push(Prisma.sql`s."city" = ${normalizePlaceName(dto.city)}`);
    if (dto.kind) where.push(Prisma.sql`s."kind" = ${dto.kind}::"SalonKind"`);
    const q = dto.q ? normalizePlaceName(dto.q) : "";
    if (q) {
      const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      // A private (home) address is never searchable.
      where.push(Prisma.sql`(s."name" ILIKE ${like}
        OR (s."address" ILIKE ${like} AND (s."kind" = 'SALON' OR s."serviceLocations" && ARRAY['IN_SALON', 'STUDIO']::"ServiceLocation"[]))
        OR s."hostSalonName" ILIKE ${like}
        OR EXISTS (
        SELECT 1 FROM "services" sv WHERE sv."salonId" = s."id" AND sv."active" AND sv."name" ILIKE ${like}))`);
    }

    if (!near) {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT s."id" FROM "salons" s WHERE ${Prisma.join(where, " AND ")} ORDER BY s."name" LIMIT ${MAX_CANDIDATES}`;
      return rows.map((r) => ({ id: r.id, km: null as number | null }));
    }

    where.push(Prisma.sql`s."latitude" IS NOT NULL`);
    if (dto.radiusKm != null) {
      const box = boundingBox(near.lat, near.lng, dto.radiusKm);
      where.push(Prisma.sql`s."latitude" BETWEEN ${box.minLat} AND ${box.maxLat} AND s."longitude" BETWEEN ${box.minLng} AND ${box.maxLng}`);
    }
    // Haversine, the SQL twin of haversineKm in geo.util.ts.
    const km = Prisma.sql`(2 * ${EARTH_RADIUS_KM} * asin(least(1, sqrt(
      power(sin(radians(s."latitude" - ${near.lat}) / 2), 2) +
      cos(radians(${near.lat})) * cos(radians(s."latitude")) * power(sin(radians(s."longitude" - ${near.lng}) / 2), 2)))))`;
    const rows = await this.prisma.$queryRaw<{ id: string; km: number }[]>`
      SELECT * FROM (SELECT s."id", ${km} AS km FROM "salons" s WHERE ${Prisma.join(where, " AND ")}) t
      ${dto.radiusKm != null ? Prisma.sql`WHERE t.km <= ${dto.radiusKm}` : Prisma.empty}
      ORDER BY t.km LIMIT ${MAX_CANDIDATES}`;
    return rows.map((r) => ({ id: r.id, km: Number(r.km) }));
  }

  async ratingStats(salonIds: string[]) {
    if (salonIds.length === 0) return new Map<string, RatingStats>();
    const rows = await this.prisma.review.groupBy({
      by: ["salonId"],
      where: { salonId: { in: salonIds }, target: ReviewTarget.SALON, status: ReviewStatus.APPROVED, rating: { not: null } },
      _sum: { rating: true },
      _count: { rating: true },
    });
    return new Map<string, RatingStats>(rows.map((r) => [r.salonId, { ratingSum: r._sum.rating ?? 0, ratingCount: r._count.rating }]));
  }

  /** Cards for specific salons (favorites), in the given order. */
  async cards(salonIds: string[]) {
    const [rows, stats] = await Promise.all([
      this.prisma.salon.findMany({ where: { id: { in: salonIds }, status: SalonStatus.ACTIVE }, select: CARD_SELECT }),
      this.ratingStats(salonIds),
    ]);
    const byId = new Map(rows.map((r) => [r.id, r]));
    return salonIds.flatMap((id) => {
      const row = byId.get(id);
      return row ? [toSalonCard(row, stats.get(id), null)] : [];
    });
  }
}

export function toSalonCard(row: SalonCardRow, stats: RatingStats | undefined, km: number | null) {
  const st = stats ?? { ratingSum: 0, ratingCount: 0 };
  const s = publicLocation(row);
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    kind: s.kind,
    serviceLocations: s.serviceLocations,
    serviceArea: s.serviceArea,
    hostSalonName: s.hostSalonName,
    province: s.province,
    city: s.city,
    address: s.address,
    approximateLocation: s.approximateLocation,
    logoUrl: s.logoUrl,
    coverImageUrl: s.coverImageUrl,
    latitude: s.latitude,
    longitude: s.longitude,
    rating: averageRating(st),
    ratingCount: st.ratingCount,
    /** One decimal; null unless the search was near a point. */
    // A private address is only placed to the nearest km (a precise distance would reveal it).
    distanceKm: km == null ? null : s.approximateLocation ? Math.max(1, Math.round(km)) : Math.round(km * 10) / 10,
    services: s.services.slice(0, SERVICE_PREVIEW).map((x) => x.name),
    serviceCount: s.services.length,
    minPriceToman: s.services[0]?.priceToman ?? null,
  };
}
