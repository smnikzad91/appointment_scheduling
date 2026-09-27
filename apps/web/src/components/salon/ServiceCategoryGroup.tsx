"use client";

import type { Salon } from "@/types/salon";
import { useBooking } from "./booking/BookingProvider";
import ServiceCard from "./ServiceCard";
import { Sparkles } from "lucide-react";

export default function ServiceCategoryGroup({ salon }: { salon: Salon }) {
  const { openWithService } = useBooking();
  const activeServices = salon.services.filter((s) => s.active);

  if (activeServices.length === 0) {
    return (
      <section id="services" className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="mb-4 text-lg font-bold">خدمات</h2>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Sparkles className="h-6 w-6" aria-hidden />
          هنوز خدمتی ثبت نشده است.
        </div>
      </section>
    );
  }

  const categories = [...salon.serviceCategories].sort((a, b) => a.order - b.order);

  return (
    <section id="services" className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-4 text-lg font-bold">خدمات</h2>
      <div className="flex flex-col gap-6">
        {categories.map((category) => {
          const services = activeServices.filter((s) => s.categoryId === category.id);
          if (services.length === 0) return null;

          return (
            <div key={category.id}>
              <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">{category.name}</h3>
              <div className="flex flex-col gap-2">
                {services.map((service) => (
                  <ServiceCard key={service.id} service={service} onBook={openWithService} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
