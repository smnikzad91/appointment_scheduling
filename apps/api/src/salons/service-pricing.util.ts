import type { Service, StylistService } from "@appointment-scheduling/database";

export interface EffectiveServicePricing {
  serviceId: string;
  priceToman: number;
  durationMinutes: number;
}

/** Resolves each service's price/duration for a specific stylist, applying their overrides where set. */
export function effectiveServicePricing(
  services: Pick<Service, "id" | "priceToman" | "durationMinutes">[],
  stylistServices: Pick<StylistService, "serviceId" | "overridePriceToman" | "overrideDurationMinutes">[],
): EffectiveServicePricing[] {
  const overrides = new Map(stylistServices.map((ss) => [ss.serviceId, ss]));
  return services.map((service) => {
    const override = overrides.get(service.id);
    return {
      serviceId: service.id,
      priceToman: override?.overridePriceToman ?? service.priceToman,
      durationMinutes: override?.overrideDurationMinutes ?? service.durationMinutes,
    };
  });
}

export function sumEffectivePricing(pricing: EffectiveServicePricing[]) {
  return pricing.reduce(
    (acc, p) => ({ priceToman: acc.priceToman + p.priceToman, durationMinutes: acc.durationMinutes + p.durationMinutes }),
    { priceToman: 0, durationMinutes: 0 },
  );
}
