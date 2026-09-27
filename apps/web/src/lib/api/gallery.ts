import { salonApiFetch } from "./salonApiClient";

// Artwork gallery (apps/api src/gallery). Owners manage the whole salon gallery and can credit a
// piece to a stylist; stylists manage the pieces credited to them.

export interface GalleryItem {
  id: string;
  salonId: string;
  stylistId: string | null;
  url: string;
  caption: string | null;
  createdAt: string;
  stylist: { id: string; displayName: string } | null;
}

export type GalleryScope = "salon" | "stylist";

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const base = (scope: GalleryScope) => (scope === "salon" ? "/salons/mine/gallery" : "/stylists/me/gallery");

export const GALLERY_LIMIT: Record<GalleryScope, number> = { salon: 60, stylist: 30 };

export function listGallery(token: string, scope: GalleryScope) {
  return salonApiFetch<GalleryItem[]>(base(scope), { headers: auth(token) });
}

export function addGalleryImage(token: string, scope: GalleryScope, data: { url: string; caption?: string; stylistId?: string | null }) {
  return salonApiFetch<GalleryItem>(base(scope), { method: "POST", headers: auth(token), body: JSON.stringify(data) });
}

export function updateGalleryImage(token: string, id: string, data: { caption?: string | null; stylistId?: string | null }) {
  return salonApiFetch<GalleryItem>(`/gallery/${id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(data) });
}

export function deleteGalleryImage(token: string, id: string) {
  return salonApiFetch<{ ok: true; url: string }>(`/gallery/${id}`, { method: "DELETE", headers: auth(token) });
}
