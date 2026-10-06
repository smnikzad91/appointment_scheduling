"use client";

import { useState } from "react";
import { ChevronLeft, Loader2, MapPin, Navigation } from "lucide-react";
import Sheet from "@/components/app/Sheet";
import type { GeoLocation } from "@/types/salon";
import { directionsUrl, normalizeLatLng, type LatLng, type MapApp } from "@/lib/directions";

// Letter marks in each app's colour (not their logos, which are trademarks).
const APPS: { id: MapApp; label: string; hint: string; mark: string; badge: string }[] = [
  { id: "neshan", label: "نشان", hint: "مسیر از موقعیت فعلی شما", mark: "ن", badge: "bg-[#1f3d8f] text-white" },
  { id: "balad", label: "بلد", hint: "مسیر از موقعیت فعلی شما", mark: "ب", badge: "bg-[#12a57a] text-white" },
  { id: "google", label: "گوگل مپ", hint: "Google Maps", mark: "G", badge: "bg-white text-[#4285f4] ring-1 ring-black/10" },
];

/** The user's position for Neshan's and Balad's route origin; null when denied, unavailable or slow. */
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
 * Neshan's and Balad's links carry the user's position as the origin when the browser gives it;
 * otherwise — and for Google Maps always — the map routes from (or asks for) the current location.
 */
export default function DirectionsButton({ location, salonName, address }: { location: GeoLocation; salonName: string; address?: string }) {
  const dest = normalizeLatLng(location);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<MapApp | null>(null);

  if (!dest) return null; // bad coordinates: no button rather than a route to nowhere

  async function go(app: MapApp) {
    // Neshan's and Balad's routing links take an origin; Google resolves the user's location itself.
    let origin: LatLng | null = null;
    setBusy(app);
    if (app !== "google") origin = await currentPosition();
    const url = directionsUrl(app, dest!, { origin });
    // Same tab: a new tab opened after the GPS wait would be blocked as a popup. On a phone the
    // map app (or site) opens on top anyway.
    window.location.assign(url);
    // If nothing takes over the page (desktop, app declined), let the user pick again.
    setTimeout(() => setBusy(null), 2_500);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-bold text-white shadow-lg transition hover:opacity-90 active:scale-[0.99]"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        <Navigation className="h-4 w-4" aria-hidden />
        مسیریابی
      </button>

      {/* Portalled to <body>: outside the salon page's guest wrapper and its --salon-brand, hence
          guest-root here and the theme accent for the pin. */}
      <Sheet open={open} onClose={() => busy === null && setOpen(false)} title="مسیریابی" themeClassName="guest-root">
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-app-card-2 p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent text-app-accent-ink">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-app-ink">{salonName}</p>
            {address && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-app-muted">{address}</p>}
          </div>
        </div>

        <p className="mb-2 px-1 text-[13px] font-bold text-app-muted">با کدام برنامه مسیریابی شود؟</p>
        <div className="flex flex-col gap-2">
          {APPS.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy !== null}
              onClick={() => go(a.id)}
              className="flex items-center gap-3 rounded-2xl border border-app-line bg-app-card p-3 text-start transition active:scale-[0.99] disabled:opacity-60 enabled:hover:border-app-accent/50"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${a.badge}`} aria-hidden>
                {a.mark}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-app-ink">{a.label}</span>
                <span className="block truncate text-xs text-app-muted" dir={a.id === "google" ? "ltr" : undefined}>
                  {busy === a.id && a.id !== "google" ? "در حال یافتن موقعیت شما…" : a.hint}
                </span>
              </span>
              {busy === a.id ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-app-muted" aria-label="در حال باز کردن" />
              ) : (
                <ChevronLeft className="h-5 w-5 shrink-0 text-app-muted" aria-hidden />
              )}
            </button>
          ))}
        </div>
        <p className="mt-4 px-1 text-xs leading-6 text-app-muted">مسیر در سایت برنامه باز می‌شود؛ اگر برنامه روی گوشی نصب باشد، ممکن است مستقیم در خود برنامه باز شود.</p>
      </Sheet>
    </>
  );
}
