// Turn-by-turn route links to a salon, for Neshan, Balad and Google Maps. Pure functions (no DOM),
// used by components/salon/DirectionsButton.tsx.

export type MapApp = "neshan" | "balad" | "google";

export interface LatLng {
  lat: number;
  lng: number;
}

// Iran's bounding box — every salon is validated inside Iran by apps/api.
const IRAN = { minLat: 24, maxLat: 40.5, minLng: 43.5, maxLng: 64 };
const inIran = (lat: number, lng: number) => lat >= IRAN.minLat && lat <= IRAN.maxLat && lng >= IRAN.minLng && lng <= IRAN.maxLng;

/**
 * A usable destination, or null. Accepts numbers or numeric strings (never string-concatenates),
 * rejects NaN/undefined/out-of-range values, and fixes a pair stored the wrong way round
 * ({lng, lat}) when only the swapped reading lands in Iran.
 */
export function normalizeLatLng(point: { lat: unknown; lng: unknown } | null | undefined): LatLng | null {
  if (!point) return null;
  const lat = typeof point.lat === "string" ? Number.parseFloat(point.lat) : point.lat;
  const lng = typeof point.lng === "string" ? Number.parseFloat(point.lng) : point.lng;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (!inIran(lat, lng) && inIran(lng, lat)) return { lat: lng, lng: lat };
  return { lat, lng };
}

/** "35.7000000,51.4000000": latitude first, fixed precision, never exponent notation. */
const pair = (p: LatLng) => `${p.lat.toFixed(7)},${p.lng.toFixed(7)}`;

const NESHAN_PACKAGE = "org.rajman.neshan.traffic.tehran";
const BALAD_PACKAGE = "ir.balad";

/**
 * The URL that starts routing to `dest` in `app`. `origin` is the user's position when known;
 * without it each app routes from (or asks for) the phone's current location. On Android, Neshan
 * and Balad get an intent:// link that opens the installed app and falls back to the web page.
 */
export function directionsUrl(app: MapApp, dest: LatLng, opts: { origin?: LatLng | null; android?: boolean } = {}): string {
  const { origin, android } = opts;
  switch (app) {
    case "google": {
      // No origin on purpose: Google Maps routes from the device's current location.
      const q = new URLSearchParams({ api: "1", destination: pair(dest), travelmode: "driving" });
      return `https://www.google.com/maps/dir/?${q}`;
    }
    case "neshan": {
      const q = `${origin ? `origin=${pair(origin)}&` : ""}destination=${pair(dest)}`;
      const web = `https://neshan.org/maps/routing?${q}`;
      return android ? androidIntent("nshn", `routing?${q}`, NESHAN_PACKAGE, web) : web;
    }
    case "balad": {
      const q = `latitude=${dest.lat.toFixed(7)}&longitude=${dest.lng.toFixed(7)}`;
      const web = `https://balad.ir/location?${q}`;
      return android ? androidIntent("balad", `navigation?${q}`, BALAD_PACKAGE, web) : web;
    }
  }
}

/** Chrome/Android intent link: opens `pkg` with scheme://path, else goes to `fallback`. */
function androidIntent(scheme: string, path: string, pkg: string, fallback: string) {
  return `intent://${path}#Intent;scheme=${scheme};package=${pkg};S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}
