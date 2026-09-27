import type { Salon, Stylist, WorkingHours, Review, WeekDay } from "@/types/salon";
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
}

interface RawReview {
  id: string;
  rating: number;
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

function mapStylist(raw: RawStylist, services: RawService[]): Stylist {
  const serviceIds = raw.services.map((s) => s.serviceId);
  const categoryIds = new Set(
    services.filter((s) => serviceIds.includes(s.id) && s.categoryId).map((s) => s.categoryId as string),
  );
  const byServiceId = new Map(services.map((s) => [s.id, s]));

  return {
    id: raw.id,
    displayName: raw.displayName,
    avatarUrl: raw.avatarUrl,
    bio: raw.bio,
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

function mapReview(raw: RawReview): Review {
  return {
    id: raw.id,
    customerName: raw.customer.firstName,
    customerAvatarUrl: raw.customer.avatarUrl,
    rating: raw.rating,
    comment: raw.comment,
    createdAt: raw.createdAt,
  };
}

export async function getSalonBySlug(slug: string): Promise<Salon | null> {
  let raw: RawSalon;
  let reviews: RawReview[];

  try {
    [raw, reviews] = await Promise.all([
      salonApiFetch<RawSalon>(`/salons/${slug}`),
      salonApiFetch<RawReview[]>(`/salons/${slug}/reviews`),
    ]);
  } catch (err) {
    if (err instanceof SalonApiError && err.status === 404) return null;
    throw err;
  }

  const ratingCount = reviews.length;
  const ratingAverage = ratingCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount : 0;

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
    stylists: raw.stylists.map((s) => mapStylist(s, raw.services)),
    gallery: [],
    reviews: reviews.map(mapReview),
    ratingAverage,
    ratingCount,
  };
}
