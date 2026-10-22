"use client";

import type { Salon } from "@/types/salon";
import { useBooking } from "./booking/BookingProvider";
import ServiceCard from "./ServiceCard";
import { Sparkles } from "lucide-react";
import { groupServicesByCategory } from "@/lib/serviceGroups";

export default function ServiceCategoryGroup({ salon }: { salon: Salon }) {
  const { openWithService } = useBooking();
  const activeServices = salon.services.filter((s) => s.active);

  if (activeServices.length === 0) {
    return (
      <section id="services" className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="mb-4 text-lg font-bold">خدمات</h2>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-g-line py-10 text-center text-sm text-g-muted">
          <Sparkles className="h-6 w-6" aria-hidden />
          هنوز خدمتی ثبت نشده است.
        </div>
      </section>
    );
  }

  const groups = groupServicesByCategory(salon.serviceCategories, activeServices);

  return (
    <section id="services" className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-4 text-lg font-bold">خدمات</h2>
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.key}>
            {group.name && <h3 className="mb-3 text-sm font-semibold text-g-muted">{group.name}</h3>}
            <div className="flex flex-col gap-2">
              {group.services.map((service) => (
                <ServiceCard key={service.id} service={service} onBook={openWithService} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
