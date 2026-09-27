"use client";

import { useEffect } from "react";

/** Registers public/sw.js (offline screen for the installed app). Production only — in dev it would fight hot reload. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not critical — the app works without it, just without the offline screen.
    });
  }, []);
  return null;
}
