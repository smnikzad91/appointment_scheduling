import { salonApiFetch } from "./salonApiClient";

// Salon discovery (apps/api GET /salons/search), saved salons (/me/favorites) and the "tell me
// when a time opens up" waitlist (/salons/:slug/waitlist, /me/waitlist).

export interface SalonCard {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  city: string;
  address: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  ratingCount: number;
  /** Only when searching near a point. */
  distanceKm: number | null;
  services: string[];
  serviceCount: number;
  minPriceToman: number | null;
}

export interface SalonSearchParams {
  province?: string;
  city?: string;
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: "distance" | "rating";
  limit?: number;
  offset?: number;
}

export interface SalonSearchResult {
  total: number;
  truncated: boolean;
  items: SalonCard[];
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export function searchSalons(params: SalonSearchParams) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );
  return salonApiFetch<SalonSearchResult>(`/salons/search?${qs}`);
}

export function listFavorites(token: string) {
  return salonApiFetch<SalonCard[]>("/me/favorites", { headers: auth(token) });
}

export function favoriteIds(token: string) {
  return salonApiFetch<string[]>("/me/favorites/ids", { headers: auth(token) });
}

export function addFavorite(token: string, salonId: string) {
  return salonApiFetch<{ ok: true }>(`/me/favorites/${salonId}`, { method: "PUT", headers: auth(token) });
}

export function removeFavorite(token: string, salonId: string) {
  return salonApiFetch<{ ok: true }>(`/me/favorites/${salonId}`, { method: "DELETE", headers: auth(token) });
}

export interface WaitlistEntry {
  id: string;
  dateKey: string;
  serviceIds: string[];
  notifiedAt: string | null;
  createdAt: string;
  salon: { name: string; slug: string; logoUrl: string | null };
  stylist: { id: string; displayName: string } | null;
}

export function joinWaitlist(token: string, slug: string, data: { date: string; serviceIds: string[]; stylistId?: string }) {
  return salonApiFetch<{ id: string }>(`/salons/${slug}/waitlist`, { method: "POST", headers: auth(token), body: JSON.stringify(data) });
}

export function listMyWaitlist(token: string) {
  return salonApiFetch<WaitlistEntry[]>("/me/waitlist", { headers: auth(token) });
}

export function leaveWaitlist(token: string, id: string) {
  return salonApiFetch<{ ok: true }>(`/me/waitlist/${id}`, { method: "DELETE", headers: auth(token) });
}
