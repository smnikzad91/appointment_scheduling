"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at module scope, so it must never run during SSR.
const SalonsMapLoader = dynamic(() => import("./SalonsMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-app-card-2" />,
});

export default SalonsMapLoader;
