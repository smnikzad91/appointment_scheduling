"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Navigation } from "lucide-react";
import type { GeoLocation } from "@/types/salon";
import { directionsUrl, normalizeLatLng, type LatLng, type MapApp } from "@/lib/directions";

const APPS: { id: MapApp; label: string }[] = [
  { id: "neshan", label: "نشان" },
  { id: "balad", label: "بلد" },
  { id: "google", label: "گوگل مپ" },
];

/** The user's position for Neshan's route origin; null when denied, unavailable or slow. */
function currentPosition(timeoutMs = 5_000): Promise<LatLng | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/**
 * «مسیریابی»: pick Neshan, Balad or Google Maps and start a route to the salon (lib/directions.ts).
 * Neshan's link carries the user's position as the origin when the browser gives it; otherwise —
 * and for Google Maps and Balad always — the app routes from (or asks for) the phone's location.
 * On Android, Neshan and Balad open the installed app, falling back to their web map.
 */
export default function DirectionsButton({ location }: { location: GeoLocation }) {
  const dest = normalizeLatLng(location);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<MapApp | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!dest) return null; // bad coordinates: no button rather than a route to nowhere

  async function go(app: MapApp) {
    const android = /Android/i.test(navigator.userAgent);
    // Only Neshan's routing link takes an origin; Google and Balad resolve the user's location themselves.
    let origin: LatLng | null = null;
    if (app === "neshan") {
      setBusy(app);
      origin = await currentPosition();
      setBusy(null);
    }
    const url = directionsUrl(app, dest!, { origin, android });
    setOpen(false);
    // Same tab: intent:// links must be navigated to, and a new tab opened after the GPS wait
    // would be blocked as a popup. On a phone the map app opens on top anyway.
    window.location.assign(url);
  }

  return (
    <div ref={root} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        <Navigation className="h-4 w-4" aria-hidden />
        مسیریابی
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-g-line bg-g-bg/95 p-1 shadow-xl backdrop-blur-xl">
          <p className="px-3 pb-1 pt-2 text-[11px] text-g-faint">مسیریابی با</p>
          {APPS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              disabled={busy !== null}
              onClick={() => go(a.id)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-bold text-g-ink transition hover:bg-white/5 disabled:opacity-60"
            >
              {a.label}
              {busy === a.id && <Loader2 className="h-4 w-4 animate-spin" aria-label="در حال یافتن موقعیت شما" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
