/**
 * Independent (freelance) stylists: a one-person business, stored as a salon of kind INDEPENDENT
 * whose owner is also its only stylist (see apps/api). Shared labels for the panel, sign-up,
 * public page, search and booking.
 */

export type SalonKind = "SALON" | "INDEPENDENT";
export type ServiceLocation = "IN_SALON" | "STUDIO" | "HOME" | "CLIENT_HOME";

/** IN_SALON first: most independent stylists rent a chair or room in a salon, under their own name. */
export const SERVICE_LOCATIONS: ServiceLocation[] = ["IN_SALON", "STUDIO", "HOME", "CLIENT_HOME"];

export const SERVICE_LOCATION_LABEL: Record<ServiceLocation, string> = {
  IN_SALON: "در یک سالن، با نام خودم",
  STUDIO: "استودیو شخصی",
  HOME: "در منزل آرایشگر",
  CLIENT_HOME: "خدمات در منزل مشتری",
};

/** How a booking's place reads to customers and in the booking lists (short, no "with my own name"). */
export const PLACE_LABEL: Record<ServiceLocation, string> = {
  IN_SALON: "در سالن",
  STUDIO: "در استودیو",
  HOME: "در منزل آرایشگر",
  CLIENT_HOME: "در منزل مشتری",
};

/** A place with the host salon's name when there is one («در سالن رز»). */
export function placeLabel(loc: ServiceLocation, hostSalonName?: string | null): string {
  return loc === "IN_SALON" && hostSalonName ? `در ${hostSalonName}` : PLACE_LABEL[loc];
}

/** One line explaining each choice (sign-up and settings). */
export const SERVICE_LOCATION_HINT: Record<ServiceLocation, string> = {
  IN_SALON: "صندلی یا اتاقی در سالنی دیگر؛ نشانی سالن به مشتری‌ها نشان داده می‌شود.",
  STUDIO: "نشانی و موقعیت روی نقشه به همه نشان داده می‌شود.",
  HOME: "نشانی دقیق فقط به مشتری‌ای که نوبت گرفته نشان داده می‌شود.",
  CLIENT_HOME: "مشتری هنگام رزرو نشانی خودش را وارد می‌کند.",
};

export const INDEPENDENT_BADGE = "آرایشگر مستقل";

export const isIndependent = (s: { kind?: SalonKind | null } | null | undefined) => s?.kind === "INDEPENDENT";
