import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

// Installable app ("Add to Home Screen"): opens full-screen, without browser chrome, straight
// into the right panel for whoever is signed in (see app/launch/page.tsx).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/launch",
    name: `${SITE_NAME} | سامانه نوبت دهی آنلاین سالن‌های زیبایی`,
    short_name: SITE_NAME,
    description: "سامانه هوشمند رزرو آنلاین و مدیریت نوبت سالن‌های زیبایی",
    lang: "fa",
    dir: "rtl",
    start_url: "/launch",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    // Brand dark (branding/): the splash screen behind the icon and the installed app's title bar.
    background_color: "#121319",
    theme_color: "#121319",
    categories: ["business", "lifestyle"],
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "نوبت‌های سالن", url: "/salon/appointments", icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }] },
      { name: "نوبت‌های من (آرایشگر)", url: "/stylist/appointments", icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }] },
    ],
  };
}
