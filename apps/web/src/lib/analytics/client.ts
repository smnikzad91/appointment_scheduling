"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isTrackedPath } from "./parse";

// Browser side of public-site analytics: a page view on every public page (client-side navigations
// included) and the salon page's booking events, sent with sendBeacon so they never delay anything.

function send(kind: "view" | "booking_open" | "booking_done", path: string, referrer?: string) {
  try {
    const body = JSON.stringify({ kind, path, referrer });
    if (navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/visit", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {
    // analytics must never break the page
  }
}

/** A salon page's booking sheet was opened / a booking was made (BookingProvider, StepSuccess). */
export function trackBookingEvent(kind: "booking_open" | "booking_done") {
  send(kind, window.location.pathname);
}

/** Mounted once in the root layout: one view per public page shown. */
export function VisitTracker() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname) return;
    // first page: where the browser came from; after that, the page before it on this site
    const referrer = previous.current === null ? document.referrer : `${window.location.origin}${previous.current}`;
    previous.current = pathname;
    if (isTrackedPath(pathname)) send("view", pathname, referrer);
  }, [pathname]);
  return null;
}
