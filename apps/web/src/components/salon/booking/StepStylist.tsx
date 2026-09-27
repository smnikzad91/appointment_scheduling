"use client";

import { Check, Star } from "lucide-react";
import { useBooking } from "./BookingProvider";
import { toPersianDigits, formatToman } from "@/lib/persian";
import Sep from "@/components/common/Sep";

export default function StepStylist() {
  const { salon, state, updateState, goNext } = useBooking();

  const eligibleStylists = salon.stylists.filter((stylist) => {
    const stylistServiceIds = new Set(stylist.services.map((s) => s.serviceId));
    return state.serviceIds.every((serviceId) => stylistServiceIds.has(serviceId));
  });

  function pricingFor(stylist: (typeof eligibleStylists)[number]) {
    return state.serviceIds.reduce(
      (acc, serviceId) => {
        const s = stylist.services.find((x) => x.serviceId === serviceId);
        return s ? { priceToman: acc.priceToman + s.priceToman, durationMinutes: acc.durationMinutes + s.durationMinutes } : acc;
      },
      { priceToman: 0, durationMinutes: 0 },
    );
  }

  function select(stylistId: string | null) {
    updateState({ stylistId });
    goNext();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => select(null)}
        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-start dark:border-gray-800"
      >
        <span className="text-sm font-medium">فرقی نمی‌کند</span>
        {state.stylistId === null && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: "var(--salon-brand)" }}>
            <Check className="h-3 w-3 text-white" aria-hidden />
          </span>
        )}
      </button>

      {eligibleStylists.map((stylist) => (
        <button
          key={stylist.id}
          type="button"
          onClick={() => select(stylist.id)}
          className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-start dark:border-gray-800"
        >
          {stylist.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stylist.avatarUrl} alt={stylist.displayName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500 dark:bg-gray-800">
              {stylist.displayName.slice(0, 1)}
            </div>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{stylist.displayName}</span>
            <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {stylist.rating !== undefined && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                  {toPersianDigits(stylist.rating.toFixed(1))}
                </span>
              )}
              {state.serviceIds.length > 0 && (
                <span>
                  {toPersianDigits(pricingFor(stylist).durationMinutes)} دقیقه<Sep />{formatToman(pricingFor(stylist).priceToman)}
                </span>
              )}
            </span>
          </span>
          {state.stylistId === stylist.id && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--salon-brand)" }}>
              <Check className="h-3 w-3 text-white" aria-hidden />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
