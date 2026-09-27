import { salonApiFetch } from "./salonApiClient";

// Home page showcase (apps/api src/showcase): a supplier banner, up to three featured salons and
// stylists chosen by the platform admin, and top-rated salons/stylists computed from reviews.

export interface ShowcaseSalon {
  id: string;
  name: string;
  slug: string;
  city: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  /** Average of approved star ratings (one decimal), or null with none. */
  rating: number | null;
  ratingCount: number;
}

export interface ShowcaseStylist {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  salon: { name: string; slug: string; city: string };
  rating: number | null;
  ratingCount: number;
}

export interface Showcase {
  banner: { imageUrl: string; linkUrl: string | null; title: string | null } | null;
  featuredSalons: ShowcaseSalon[];
  featuredStylists: ShowcaseStylist[];
  topSalons: ShowcaseSalon[];
  topStylists: ShowcaseStylist[];
}

export interface AdminBanner {
  imageUrl: string | null;
  linkUrl: string | null;
  title: string | null;
  active: boolean;
}

export interface AdminShowcase {
  banner: AdminBanner;
  /** minRatings: approved star ratings needed to appear in "top rated". */
  settings: { minRatings: number };
  featuredSalons: (ShowcaseSalon & { priority: number; visible: boolean })[];
  featuredStylists: (ShowcaseStylist & { priority: number; visible: boolean })[];
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Public — used by the home page (server-side). */
export function getShowcase() {
  return salonApiFetch<Showcase>("/showcase", { next: { revalidate: 60 } } as RequestInit);
}

export function getAdminShowcase(token: string) {
  return salonApiFetch<AdminShowcase>("/admin/showcase", { headers: auth(token) });
}

export function updateBanner(token: string, data: Partial<AdminBanner>) {
  return salonApiFetch<AdminBanner>("/admin/showcase/banner", { method: "PUT", headers: auth(token), body: JSON.stringify(data) });
}

export function updateShowcaseSettings(token: string, data: { minRatings: number }) {
  return salonApiFetch<{ minRatings: number }>("/admin/showcase/settings", { method: "PUT", headers: auth(token), body: JSON.stringify(data) });
}

export function setFeaturedSalons(token: string, ids: string[]) {
  return salonApiFetch<AdminShowcase>("/admin/showcase/featured-salons", { method: "PUT", headers: auth(token), body: JSON.stringify({ ids }) });
}

export function setFeaturedStylists(token: string, ids: string[]) {
  return salonApiFetch<AdminShowcase>("/admin/showcase/featured-stylists", { method: "PUT", headers: auth(token), body: JSON.stringify({ ids }) });
}

export function searchShowcaseSalons(token: string, q: string) {
  return salonApiFetch<ShowcaseSalon[]>(`/admin/showcase/salons?q=${encodeURIComponent(q)}`, { headers: auth(token) });
}

export function searchShowcaseStylists(token: string, q: string) {
  return salonApiFetch<ShowcaseStylist[]>(`/admin/showcase/stylists?q=${encodeURIComponent(q)}`, { headers: auth(token) });
}
