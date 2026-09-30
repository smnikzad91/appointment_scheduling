import { SalonKind, ServiceLocation } from "@appointment-scheduling/database";

type Locatable = {
  kind: SalonKind;
  serviceLocations: ServiceLocation[];
  address: string;
  latitude: number | null;
  longitude: number | null;
};

/**
 * An independent stylist who works from home or only visits customers has a private address:
 * the public never gets it, and the map pin is rounded to ~1 km (2 decimals). A salon, or an
 * independent stylist with a studio, shows both as given.
 */
export function hasPrivateAddress(s: Pick<Locatable, "kind" | "serviceLocations">): boolean {
  return s.kind === SalonKind.INDEPENDENT && !s.serviceLocations.includes(ServiceLocation.STUDIO);
}

const roughly = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);

export function publicLocation<T extends Locatable>(s: T): Omit<T, "address"> & { address: string | null; approximateLocation: boolean } {
  if (!hasPrivateAddress(s)) return { ...s, approximateLocation: false };
  return { ...s, address: null, latitude: roughly(s.latitude), longitude: roughly(s.longitude), approximateLocation: true };
}
