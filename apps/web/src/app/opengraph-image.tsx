import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The site's share preview (/opengraph-image, also the fallback of blog/news/city pages): the brand
// package's og-image (branding/og-image.png, 2026-10-31) — emblem, «نوبتت», tagline, nobatet.app.
export const alt = "نوبتت — نرم‌افزار نوبت‌دهی آنلاین آرایشگاه و سالن زیبایی";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const png = await readFile(join(process.cwd(), "src/app/og-image.png"));
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
