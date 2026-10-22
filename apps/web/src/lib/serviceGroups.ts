// A salon's services grouped under its categories (by `order`) for the public page and the booking
// sheet. Services with no category — or one that no longer exists — come last as «سایر خدمات», or
// with no heading at all when the salon has no categories in use, so an owner who never made a
// category still has every service bookable. The Android app groups the same way (SalonScreen.kt).

export interface ServiceGroup<S> {
  key: string;
  /** null = no heading (the only group) */
  name: string | null;
  services: S[];
}

export const UNCATEGORIZED_LABEL = "سایر خدمات";

export function groupServicesByCategory<S extends { categoryId: string | null }>(
  categories: { id: string; name: string; order: number }[],
  services: S[],
): ServiceGroup<S>[] {
  const known = new Set(categories.map((c) => c.id));
  const groups: ServiceGroup<S>[] = [...categories]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ key: c.id, name: c.name, services: services.filter((s) => s.categoryId === c.id) }))
    .filter((g) => g.services.length > 0);
  const rest = services.filter((s) => !s.categoryId || !known.has(s.categoryId));
  if (rest.length) groups.push({ key: "uncategorized", name: groups.length ? UNCATEGORIZED_LABEL : null, services: rest });
  return groups;
}
