/**
 * An independent (freelance) stylist runs their own one-person business: a Salon of kind
 * INDEPENDENT that they own, with themselves as its only stylist. On the web they use the salon
 * panel (/salon), so everywhere the salon owner is allowed, they are too.
 */
export const SALON_PANEL_ROLES = ["SALON_OWNER", "INDEPENDENT_STYLIST"] as const;

export function usesSalonPanel(role: string | undefined | null): boolean {
  return !!role && (SALON_PANEL_ROLES as readonly string[]).includes(role);
}
