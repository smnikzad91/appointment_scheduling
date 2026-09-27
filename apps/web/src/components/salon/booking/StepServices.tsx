"use client";

import { Check } from "lucide-react";
import { useBooking } from "./BookingProvider";
import { formatToman, toPersianDigits } from "@/lib/persian";
import { getTotalDurationMinutes } from "@/lib/api/slots";

export default function StepServices() {
  const { salon, state, toggleService, goNext } = useBooking();
  const activeServices = salon.services.filter((s) => s.active);

  const selected = activeServices.filter((s) => state.serviceIds.includes(s.id));
  const totalPrice = selected.reduce((sum, s) => sum + s.priceToman, 0);
  const totalDuration = getTotalDurationMinutes(salon, state.serviceIds);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {salon.serviceCategories.map((category) => {
          const services = activeServices.filter((s) => s.categoryId === category.id);
          if (services.length === 0) return null;

          return (
            <div key={category.id}>
              <h3 className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{category.name}</h3>
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
                        isSelected ? "border-transparent" : "border-gray-200 dark:border-gray-800"
                      }`}
                      style={isSelected ? { backgroundColor: "var(--salon-brand-soft)", borderColor: "var(--salon-brand)" } : undefined}
                    >
                      <span>
                        <span className="block text-sm font-medium">{service.name}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {toPersianDigits(service.durationMinutes)} دقیقه · {formatToman(service.priceToman)}
                        </span>
                      </span>
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                        style={
                          isSelected
                            ? { backgroundColor: "var(--salon-brand)", borderColor: "var(--salon-brand)" }
                            : { borderColor: "var(--color-gray-300, #d1d5db)" }
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
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800/50">
          <span className="text-gray-500 dark:text-gray-400">
            {toPersianDigits(selected.length)} خدمت · {toPersianDigits(totalDuration)} دقیقه
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
