"use client";

import { Check } from "lucide-react";
import { useBooking } from "./BookingProvider";
import { formatToman, toPersianDigits } from "@/lib/persian";
import { getTotalDurationMinutes } from "@/lib/api/slots";
import Sep from "@/components/common/Sep";

export default function StepServices() {
  const { salon, state, toggleService, updateState, goNext } = useBooking();
  // Opened from a stylist's own link (/book/@handle): only what that stylist does, until cleared.
  const chosenStylist = salon.kind !== "INDEPENDENT" && state.stylistId ? salon.stylists.find((s) => s.id === state.stylistId) : undefined;
  const offered = chosenStylist ? new Set(chosenStylist.services.map((s) => s.serviceId)) : null;
  const activeServices = salon.services.filter((s) => s.active && (!offered || offered.has(s.id)));

  const selected = activeServices.filter((s) => state.serviceIds.includes(s.id));
  const totalPrice = selected.reduce((sum, s) => sum + s.priceToman, 0);
  const totalDuration = getTotalDurationMinutes(salon, state.serviceIds);

  return (
    <div className="flex flex-col gap-4">
      {chosenStylist && (
        <p className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-g-muted">
          <span>
            خدمات <span className="font-bold text-g-ink">{chosenStylist.displayName}</span>
          </span>
          <button
            type="button"
            className="font-bold"
            style={{ color: "var(--salon-brand-ink)" }}
            onClick={() => updateState({ stylistId: null, serviceIds: [] })}
          >
            همه خدمات سالن
          </button>
        </p>
      )}
      <div className="flex flex-col gap-2">
        {salon.serviceCategories.map((category) => {
          const services = activeServices.filter((s) => s.categoryId === category.id);
          if (services.length === 0) return null;

          return (
            <div key={category.id}>
              <h3 className="mb-1.5 text-xs font-semibold text-g-muted">{category.name}</h3>
              <div className="flex flex-col gap-1.5">
                {services.map((service) => {
                  const isSelected = state.serviceIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      aria-pressed={isSelected}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-start transition ${
                        isSelected ? "border-transparent" : "border-g-line"
                      }`}
                      style={isSelected ? { backgroundColor: "var(--salon-brand-soft)", borderColor: "var(--salon-brand)" } : undefined}
                    >
                      <span>
                        <span className="block text-sm font-medium">{service.name}</span>
                        <span className="block text-xs text-g-muted">
                          {toPersianDigits(service.durationMinutes)} دقیقه<Sep />{formatToman(service.priceToman)}
                        </span>
                      </span>
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                        style={
                          isSelected
                            ? { backgroundColor: "var(--salon-brand)", borderColor: "var(--salon-brand)" }
                            : { borderColor: "var(--g-line-strong)" }
                        }
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" aria-hidden />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm">
          <span className="text-g-muted">
            {toPersianDigits(selected.length)} خدمت<Sep />{toPersianDigits(totalDuration)} دقیقه
          </span>
          <span className="font-bold">{formatToman(totalPrice)}</span>
        </div>
      )}

      <button
        type="button"
        disabled={selected.length === 0}
        onClick={goNext}
        className="rounded-full py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        ادامه
      </button>
    </div>
  );
}
