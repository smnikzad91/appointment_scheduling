"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Whether "back" would stay on this site. document.referrer can't tell: Next's client-side
// navigation never updates it, so a salon opened from the landing page looks like a direct visit.
// Instead every page view in this tab is counted (sessionStorage is per tab, so a shared link or QR
// opened in a new tab starts at 1).

const KEY = "in-app-page-views";

/** Mounted once in the root layout: counts page views (pathname changes) in this tab. */
export function useTrackInAppHistory() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, String(Number(sessionStorage.getItem(KEY) ?? 0) + 1));
    } catch {
      // storage blocked: canGoBackInApp falls back to "no"
    }
  }, [pathname]);
}

export function InAppHistoryTracker() {
  useTrackInAppHistory();
  return null;
}

/** True when an earlier page of this site was shown in this tab. */
export function canGoBackInApp(): boolean {
  try {
    return Number(sessionStorage.getItem(KEY) ?? 0) > 1 && window.history.length > 1;
  } catch {
    return false;
  }
}
