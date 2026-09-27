"use client";

import { useState } from "react";
import { Star, ChevronDown } from "lucide-react";
import type { Salon, Stylist } from "@/types/salon";
import { toPersianDigits } from "@/lib/persian";
import { useBooking } from "./booking/BookingProvider";
import ServiceCard from "./ServiceCard";
import Lightbox from "./Lightbox";

export default function StylistCard({ salon, stylist }: { salon: Salon; stylist: Stylist }) {
  const [expanded, setExpanded] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
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
            {stylist.gallery.length > 0 && (
              <span className="font-medium" style={{ color: "var(--salon-brand)" }}>
                {specialties.length > 0 ? " · " : ""}
                {toPersianDigits(stylist.gallery.length)} نمونه کار
              </span>
            )}
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
          {stylist.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stylist.coverImageUrl} alt={`کاور ${stylist.displayName}`} className="mb-1 h-32 w-full rounded-xl object-cover" />
          )}
          {stylist.bio && <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">{stylist.bio}</p>}
          {stylist.gallery.length > 0 && (
            <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label={`نمونه کارهای ${stylist.displayName}`}>
              {stylist.gallery.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setViewing(i)}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2"
                  style={{ outlineColor: "var(--salon-brand)" }}
                  aria-label={image.alt}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt} loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} onBook={(serviceId) => openWithService(serviceId, stylist.id)} />
          ))}
        </div>
      )}
      {viewing !== null && (
        <Lightbox images={stylist.gallery} index={viewing} onClose={() => setViewing(null)} onIndexChange={setViewing} />
      )}
    </div>
  );
}
