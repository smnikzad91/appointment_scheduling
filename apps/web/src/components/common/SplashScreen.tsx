"use client";

import { useState } from "react";
import Image from "next/image";
import { SITE_NAME } from "@/lib/site";

/**
 * Brand splash, once per browser session (the flag is set by public/theme-init.js before the first
 * paint, which also hides this with `html.splash-seen` on later loads — no flash, no layout shift:
 * it's a fixed overlay). It's server-rendered and animated purely in CSS (globals.css, `.app-splash`),
 * so it plays from the very first paint rather than after hydration:
 *   0.0–0.6s logo scales 0.7 → 1 with a soft glow · 0.6–1.2s title and tagline slide up ·
 *   1.6–2.0s the screen fades out; its own fade-out ending unmounts it.
 */
export default function SplashScreen() {
  const [done, setDone] = useState(false);
  if (done) return null;
  return (
    <div
      className="app-splash"
      aria-hidden="true"
      onAnimationEnd={(e) => {
        // Children's animations bubble here too; only the screen's own fade-out ends it.
        if (e.target === e.currentTarget && e.animationName === "splash-out") setDone(true);
      }}
    >
      <Image
        src="/images/logo/logo_symbol_transparent.png"
        alt=""
        width={128}
        height={128}
        priority
        className="app-splash__logo"
      />
      <p className="app-splash__title">{SITE_NAME}</p>
      <p className="app-splash__tagline">سامانه نوبت‌دهی آنلاین زیبایی</p>
    </div>
  );
}
