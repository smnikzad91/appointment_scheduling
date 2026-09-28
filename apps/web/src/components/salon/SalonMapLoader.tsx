"use client";

import dynamic from "next/dynamic";
import type { GeoLocation } from "@/types/salon";

// Leaflet touches `window` at module scope, so it must never run during SSR.
const SalonMap = dynamic(() => import("./SalonMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-white/5" />,
});

export default function SalonMapLoader({ location, brandColor }: { location: GeoLocation; brandColor: string }) {
  return <SalonMap location={location} brandColor={brandColor} />;
}
