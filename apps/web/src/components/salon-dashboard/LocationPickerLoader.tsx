"use client";

import dynamic from "next/dynamic";
import type { GeoLocation } from "@/types/salon";

// Leaflet touches `window` at module scope, so it must never run during SSR.
const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-100 dark:bg-gray-800" />,
});

export default function LocationPickerLoader(props: {
  value: GeoLocation | null;
  onChange: (location: GeoLocation) => void;
  /** Recentre the map here (e.g. the chosen province's capital) until a pin is placed. */
  center?: GeoLocation | null;
}) {
  return <LocationPicker {...props} />;
}
