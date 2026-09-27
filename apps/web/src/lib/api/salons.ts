import type { GalleryImage, Salon, Stylist, WorkingHours, Review, WeekDay } from "@/types/salon";
import { salonApiFetch, SalonApiError } from "./salonApiClient";

interface RawWorkingHour {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

interface RawStylistService {
  serviceId: string;
  overridePriceToman: number | null;
  overrideDurationMinutes: number | null;
}

interface RawStylist {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  workingHours: RawWorkingHour[];
  services: RawStylistService[];
}

interface RawService {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceToman: number;
  active: boolean;
}

interface RawSalon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string;
  address: string;
  phone: string;
  instagram: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  brandColor: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  serviceCategories: { id: string; name: string; order: number }[];
  services: RawService[];
  stylists: RawStylist[];
  galleryImages: { id: string; url: string; caption: string | null; stylistId: string | null }[];
}

interface RawReview {
  id: string;
  target: "SALON" | "STYLIST";
  stylistId: string | null;
  rating: number | null;
  comment: string | null;
  createdAt: string;
  customer: { firstName: string; avatarUrl: string | null };
}

/** Union of every active stylist's hours per weekday — there's no separate salon-level schedule. */
function deriveSalonWorkingHours(stylists: RawStylist[]): WorkingHours[] {
  const byDay = new Map<number, { start: number; end: number }>();

  for (const stylist of stylists) {
    for (const hour of stylist.workingHours) {
      const existing = byDay.get(hour.dayOfWeek);
      if (!existing) {
        byDay.set(hour.dayOfWeek, { start: hour.startMinute, end: hour.endMinute });
      } else {
        existing.start = Math.min(existing.start, hour.startMinute);
        existing.end = Math.max(existing.end, hour.endMinute);
      }
    }
  }

  const result: WorkingHours[] = [];
  for (let day = 0; day <= 6; day++) {
    const found = byDay.get(day);
    result.push(
      found
        ? { dayOfWeek: day as WeekDay, startMinute: found.start, endMinute: found.end }
        : { dayOfWeek: day as WeekDay, startMinute: 0, endMinute: 0, closed: true },
    );
  }
  return result;
}

function mapStylist(raw: RawStylist, services: RawService[], gallery: GalleryImage[], allReviews: Review[]): Stylist {
  const serviceIds = raw.services.map((s) => s.serviceId);
  const categoryIds = new Set(
    services.filter((s) => serviceIds.includes(s.id) && s.categoryId).map((s) => s.categoryId as string),
  );
  const byServiceId = new Map(services.map((s) => [s.id, s]));
  const reviews = allReviews.filter((r) => r.target === "STYLIST" && r.stylistId === raw.id);

  return {
    id: raw.id,
    displayName: raw.displayName,
    avatarUrl: raw.avatarUrl,
    coverImageUrl: raw.coverImageUrl,
    gallery: gallery.filter((g) => g.stylistId === raw.id),
    bio: raw.bio,
    reviews,
    ...ratingStats(reviews),
    specialtyCategoryIds: [...categoryIds],
    services: raw.services.flatMap((ss) => {
      const service = byServiceId.get(ss.serviceId);
      if (!service) return [];
      return [
        {
          serviceId: ss.serviceId,
          priceToman: ss.overridePriceToman ?? service.priceToman,
          durationMinutes: ss.overrideDurationMinutes ?? service.durationMinutes,
        },
      ];
    }),
  };
}

/** Average over the reviews that carry stars; comment-only reviews don't affect the rating. */
function ratingStats(reviews: Review[]): { rating?: number; reviewCount: number } {
  const ratings = reviews.flatMap((r) => (r.rating === null ? [] : [r.rating]));
  if (ratings.length === 0) return { reviewCount: 0 };
  return { rating: ratings.reduce((sum, n) => sum + n, 0) / ratings.length, reviewCount: ratings.length };
}

function mapReview(raw: RawReview): Review {
  return {
    id: raw.id,
    target: raw.target,
    stylistId: raw.stylistId,
    customerName: raw.customer.firstName,
    customerAvatarUrl: raw.customer.avatarUrl,
    rating: raw.rating,
    comment: raw.comment,
    createdAt: raw.createdAt,
  };
}

export async function getSalonBySlug(slug: string): Promise<Salon | null> {
  let raw: RawSalon;
  let rawReviews: RawReview[];

  try {
    [raw, rawReviews] = await Promise.all([
      salonApiFetch<RawSalon>(`/salons/${slug}`),
      salonApiFetch<RawReview[]>(`/salons/${slug}/reviews`),
    ]);
  } catch (err) {
    if (err instanceof SalonApiError && err.status === 404) return null;
    throw err;
  }

  const stylistNames = new Map(raw.stylists.map((s) => [s.id, s.displayName]));
  const gallery: GalleryImage[] = (raw.galleryImages ?? []).map((g) => {
    const by = g.stylistId ? stylistNames.get(g.stylistId) : undefined;
    return {
      id: g.id,
      url: g.url,
      stylistId: g.stylistId,
      alt: [g.caption, by && `کار ${by}`].filter(Boolean).join(" — ") || `نمونه کار ${raw.name}`,
    };
  });

  // The API returns only approved reviews. Salon reviews feed the salon's rating and review list;
  // stylist reviews go on each stylist's card.
  const allReviews = rawReviews.map(mapReview);
  const reviews = allReviews.filter((r) => r.target === "SALON");
  const salonStats = ratingStats(reviews);
  const ratingCount = salonStats.reviewCount;
  const ratingAverage = salonStats.rating ?? 0;

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    logoUrl: raw.logoUrl,
    coverImageUrl: raw.coverImageUrl,
    brandColor: raw.brandColor,
    timezone: raw.timezone,
    city: raw.city,
    address: raw.address,
    location: raw.latitude !== null && raw.longitude !== null ? { lat: raw.latitude, lng: raw.longitude } : null,
    phone: raw.phone,
    instagram: raw.instagram,
    workingHours: deriveSalonWorkingHours(raw.stylists),
    serviceCategories: raw.serviceCategories,
    services: raw.services,
    stylists: raw.stylists.map((s) => mapStylist(s, raw.services, gallery, allReviews)),
    gallery,
    reviews,
    ratingAverage,
    ratingCount,
  };
}
