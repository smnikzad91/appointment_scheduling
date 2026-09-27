// Distance helpers for "salons near me". Salon pins are plain latitude/longitude columns: the
// search prefilters with a bounding box (btree index on latitude, longitude) and orders by the
// haversine distance computed in SQL — accurate to well under 1% at city scale, and needs no
// PostGIS (not available on many Iranian hosts). The SQL twin of haversineKm lives in
// salon-search.service.ts; keep the two in step.

export const EARTH_RADIUS_KM = 6371;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** A lat/lng box that contains every point within `km` of the centre (a cheap index prefilter). */
export function boundingBox(lat: number, lng: number, km: number) {
  const dLat = (km / EARTH_RADIUS_KM) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos(rad(lat)), 0.01);
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}
