import { Clock } from "lucide-react";
import type { Service } from "@/types/salon";
import { toPersianDigits, formatToman } from "@/lib/persian";

export default function ServiceCard({
  service,
  onBook,
}: {
  service: Service;
  onBook: (serviceId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
      <div className="min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{service.name}</h3>
        {service.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{service.description}</p>
        )}
        <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {toPersianDigits(service.durationMinutes)} دقیقه
          </span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {formatToman(service.priceToman)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onBook(service.id)}
        className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        رزرو
      </button>
    </div>
  );
}
