"use client";

import { useEffect } from "react";
// Imported for its side effect: starts listening for the browser's install prompt as early as possible.
import "@/lib/installPrompt";

/**
 * Registers public/sw.js (the installed app's offline screen) in production. In development it
 * does the opposite — unregisters any worker left over from a production run on this origin, so
 * it can never serve stale pages over hot reload.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      return;
    }
    // updateViaCache "none": always check sw.js itself against the server, so fixes roll out.
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not critical — the app works without it, just without the offline screen.
    });
  }, []);
  return null;
}
