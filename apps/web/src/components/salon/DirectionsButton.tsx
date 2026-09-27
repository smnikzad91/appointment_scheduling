import { Navigation } from "lucide-react";
import type { GeoLocation } from "@/types/salon";

export default function DirectionsButton({ location }: { location: GeoLocation }) {
  // Neshan's web deep link falls back to Balad-compatible lat/lng query params;
  // opens the Neshan app on mobile if installed, otherwise the Neshan web map.
  const href = `https://neshan.org/maps/@${location.lat},${location.lng},15z`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      style={{ backgroundColor: "var(--salon-brand)" }}
    >
      <Navigation className="h-4 w-4" aria-hidden />
      مسیریابی
    </a>
  );
}
