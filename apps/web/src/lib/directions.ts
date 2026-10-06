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


/**
 * The URL that starts routing to `dest` in `app`. `origin` is the user's position when known;
 * without it each app routes from (or asks for) the phone's current location. The same https links
 * work on phones; an installed app that handles its site's links takes them over.
 */
export function directionsUrl(app: MapApp, dest: LatLng, opts: { origin?: LatLng | null } = {}): string {
  const { origin } = opts;
  switch (app) {
    case "google": {
      // No origin on purpose: Google Maps routes from the device's current location.
      const q = new URLSearchParams({ api: "1", destination: pair(dest), travelmode: "driving" });
      return `https://www.google.com/maps/dir/?${q}`;
    }
    case "neshan": {
      // Neshan's own routing URL (copied from neshan.org after starting a route there):
      //   /maps/routing/car/origin/{lat,lng}/destination/{lat,lng}
      // The same https link is used on phones: an installed Neshan app that handles neshan.org
      // links takes it over. Without the user's position the origin segment is left out, so the
      // site asks for / uses the current location.
      const from = origin ? `origin/${pair(origin)}/` : "";
      return `https://neshan.org/maps/routing/car/${from}destination/${pair(dest)}`;
    }
    case "balad": {
      // Balad's own routing URL (copied from balad.ir after starting a route there). NOTE: Balad
      // writes points as {lng,lat} — longitude first, unlike Google and Neshan:
      //   /directions/driving?origin={lng,lat}&destination={lng,lat}
      // Same https link on phones; without the user's position `origin` is left out.
      const lngLat = (p: LatLng) => `${p.lng.toFixed(7)},${p.lat.toFixed(7)}`;
      const q = new URLSearchParams({ ...(origin && { origin: lngLat(origin) }), destination: lngLat(dest) });
      return `https://balad.ir/directions/driving?${q}`;
    }
  }
}
