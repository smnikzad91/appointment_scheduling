import type { SalonKind, ServiceLocation } from "@/lib/independent";

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday .. 6 = Saturday (matches packages/database's WorkingHour.dayOfWeek)

export interface WorkingHours {
  dayOfWeek: WeekDay;
  startMinute: number; // minutes from midnight
  endMinute: number;
  closed?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  order: number;
}

export interface Service {
  id: string;
  categoryId: string | null;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceToman: number;
  active: boolean;
}

export interface StylistServicePricing {
  serviceId: string;
  priceToman: number; // effective price for this stylist — their override, or the salon default
  durationMinutes: number; // effective duration for this stylist — their override, or the salon default
}

export interface Stylist {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  gallery: GalleryImage[]; // this stylist's portfolio pieces (subset of Salon.gallery)
  bio?: string | null;
  specialtyCategoryIds: string[]; // derived from the stylist's services' categoryIds, not stored directly
  services: StylistServicePricing[];
  rating?: number; // average star rating of approved reviews about this stylist (undefined if none rated)
  reviewCount?: number; // how many of those reviews carry a rating
  reviews: Review[]; // approved reviews about this stylist, newest first
}

export interface Review {
  id: string;
  target: "SALON" | "STYLIST";
  stylistId: string | null;
  customerName: string;
  customerAvatarUrl?: string | null;
  rating: number | null; // 1-5, or null for a comment-only review
  comment: string | null;
  createdAt: string; // ISO datetime
}

export interface GalleryImage {
  id: string;
  url?: string;
  alt: string;
  stylistId?: string | null;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Salon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  brandColor: string; // hex, e.g. "#e0447b"
  timezone: string; // IANA, e.g. "Asia/Tehran" — slots and working hours are wall-clock time here
  province: string | null; // استان; null on salons created before provinces were recorded
  city: string;
  /** null for an independent stylist who works from home / only visits: private until booked. */
  address: string | null;
  location: GeoLocation | null; // null until the owner sets coordinates
  /** true = `location` is rounded to ~1 km (a private address): show an area, never a pin/directions. */
  approximateLocation: boolean;
  /** INDEPENDENT = an independent stylist's own business (they're its only stylist). */
  kind: SalonKind;
  serviceLocations: ServiceLocation[];
  serviceArea: string | null;
  phone: string;
  instagram?: string | null;
  workingHours: WorkingHours[]; // derived: union across active stylists per weekday
  serviceCategories: ServiceCategory[];
  services: Service[];
  stylists: Stylist[];
  gallery: GalleryImage[];
  reviews: Review[];
  ratingAverage: number; // over salon reviews that carry a rating
  ratingCount: number; // number of rated salon reviews (comment-only reviews aren't counted)
}

export interface TimeSlot {
  startMinute: number; // minutes from midnight, salon-local time
  available: boolean;
}

export type PartOfDay = "morning" | "noon" | "evening";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Booking {
  id: string;
  salonId: string;
  serviceIds: string[];
  stylistId: string | null;
  date: string;
  startMinute: number;
  endMinute: number;
  totalPriceToman: number;
  status: BookingStatus;
  createdAt: string;
}
