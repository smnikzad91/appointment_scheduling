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
  bio?: string | null;
  specialtyCategoryIds: string[]; // derived from the stylist's services' categoryIds, not stored directly
  services: StylistServicePricing[];
  rating?: number;
  reviewCount?: number;
}

export interface Review {
  id: string;
  customerName: string;
  customerAvatarUrl?: string | null;
  rating: number; // 1-5
  comment: string | null;
  createdAt: string; // ISO datetime
}

export interface GalleryImage {
  id: string;
  url?: string;
  alt: string;
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
  city: string;
  address: string;
  location: GeoLocation | null; // null until the owner sets coordinates
  phone: string;
  instagram?: string | null;
  workingHours: WorkingHours[]; // derived: union across active stylists per weekday
  serviceCategories: ServiceCategory[];
  services: Service[];
  stylists: Stylist[];
  gallery: GalleryImage[];
  reviews: Review[];
  ratingAverage: number;
  ratingCount: number;
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
