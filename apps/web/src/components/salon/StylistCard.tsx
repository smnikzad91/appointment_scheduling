"use client";

import { useState } from "react";
import { Star, ChevronDown } from "lucide-react";
import type { Salon, Stylist } from "@/types/salon";
import { toPersianDigits } from "@/lib/persian";
import { useBooking } from "./booking/BookingProvider";
import ServiceCard from "./ServiceCard";

export default function StylistCard({ salon, stylist }: { salon: Salon; stylist: Stylist }) {
  const [expanded, setExpanded] = useState(false);
  const { openWithService } = useBooking();
  const pricingByServiceId = new Map(stylist.services.map((s) => [s.serviceId, s]));
  const services = salon.services
    .filter((s) => pricingByServiceId.has(s.id) && s.active)
    .map((s) => {
      const pricing = pricingByServiceId.get(s.id)!;
      return { ...s, priceToman: pricing.priceToman, durationMinutes: pricing.durationMinutes };
    });
  const specialties = salon.serviceCategories.filter((c) => stylist.specialtyCategoryIds.includes(c.id));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-4 text-start"
      >
        {stylist.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stylist.avatarUrl} alt={stylist.displayName} className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-500 dark:bg-gray-800">
            {stylist.displayName.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="font-medium">{stylist.displayName}</h3>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {specialties.map((c) => c.name).join("، ")}
          </p>
          {stylist.rating && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {toPersianDigits(stylist.rating.toFixed(1))}
              {stylist.reviewCount && <span>({toPersianDigits(stylist.reviewCount)})</span>}
            </span>
          )}
        </div>

        <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
          {stylist.bio && <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">{stylist.bio}</p>}
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} onBook={(serviceId) => openWithService(serviceId, stylist.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
