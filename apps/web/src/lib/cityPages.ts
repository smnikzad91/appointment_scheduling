import { cache } from "react";
import { salonApiFetch } from "@/lib/api/salonApiClient";

// City landing pages (/salons/<city>): one per city that has at least one active salon or
// independent stylist — a city with none gets no page (thin pages hurt the whole site in Google).
// The URL is the Persian city name with spaces as "-" (e.g. /salons/بندر-عباس): it's what people search.

export interface CityEntry {
  city: string;
  province: string;
  slug: string;
  /** active salons + independent stylists there */
  count: number;
}

export const citySlug = (city: string) => city.trim().replace(/\s+/g, "-");

/** Cities with active salons, most salons first. Empty when apps/api is unreachable. */
export const activeCities = cache(async (): Promise<CityEntry[]> => {
  const salons = await salonApiFetch<{ city: string | null; province: string | null }[]>("/salons").catch(() => []);
  const byCity = new Map<string, CityEntry>();
  for (const s of salons) {
    if (!s.city) continue;
    const slug = citySlug(s.city);
    const e = byCity.get(slug) ?? { city: s.city, province: s.province ?? "", slug, count: 0 };
    e.count++;
    byCity.set(slug, e);
  }
  return [...byCity.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, "fa"));
});

export async function findCity(slug: string): Promise<CityEntry | null> {
  const wanted = citySlug(decodeURIComponent(slug));
  return (await activeCities()).find((c) => c.slug === wanted) ?? null;
}
