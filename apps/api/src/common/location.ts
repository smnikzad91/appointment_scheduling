import { BadRequestException } from "@nestjs/common";
import { findProvince, isCityInProvince, normalizePlaceName } from "@appointment-scheduling/iran-locations";

// Salon location rules shared by registration and salon settings: the province and county must
// come from packages/iran-locations (so search filters match exactly), and a map pin must be
// inside Iran's bounding box.

const IRAN_BOUNDS = { minLat: 25, maxLat: 39.9, minLng: 44, maxLng: 63.4 };

/** Normalised { province, city }, or 400 when they aren't a known province/county pair. */
export function resolveProvinceCity(province: string, city: string) {
  const p = findProvince(province);
  if (!p) throw new BadRequestException("Unknown province");
  const c = normalizePlaceName(city);
  if (!isCityInProvince(p.name, c)) throw new BadRequestException("This city is not in the selected province");
  return { province: p.name, city: c };
}

/** 400 unless both coordinates are given together and fall inside Iran. */
export function assertIranCoordinates(latitude: number | undefined | null, longitude: number | undefined | null) {
  if ((latitude == null) !== (longitude == null)) throw new BadRequestException("Send both latitude and longitude");
  if (latitude == null || longitude == null) return;
  const { minLat, maxLat, minLng, maxLng } = IRAN_BOUNDS;
  if (latitude < minLat || latitude > maxLat || longitude < minLng || longitude > maxLng) {
    throw new BadRequestException("The map pin must be inside Iran");
  }
}
