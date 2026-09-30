/**
 * Independent (freelance) stylists: a one-person business, stored as a salon of kind INDEPENDENT
 * whose owner is also its only stylist (see apps/api). Shared labels for the panel, sign-up,
 * public page, search and booking.
 */

export type SalonKind = "SALON" | "INDEPENDENT";
export type ServiceLocation = "STUDIO" | "HOME" | "CLIENT_HOME";

export const SERVICE_LOCATIONS: ServiceLocation[] = ["STUDIO", "HOME", "CLIENT_HOME"];

export const SERVICE_LOCATION_LABEL: Record<ServiceLocation, string> = {
  STUDIO: "استودیو شخصی",
  HOME: "در منزل آرایشگر",
  CLIENT_HOME: "خدمات در منزل مشتری",
};

/** One line explaining each choice (sign-up and settings). */
export const SERVICE_LOCATION_HINT: Record<ServiceLocation, string> = {
  STUDIO: "نشانی و موقعیت روی نقشه به همه نشان داده می‌شود.",
  HOME: "نشانی دقیق فقط به مشتری‌ای که نوبت گرفته نشان داده می‌شود.",
  CLIENT_HOME: "مشتری هنگام رزرو نشانی خودش را وارد می‌کند.",
};

export const INDEPENDENT_BADGE = "آرایشگر مستقل";

export const isIndependent = (s: { kind?: SalonKind | null } | null | undefined) => s?.kind === "INDEPENDENT";
