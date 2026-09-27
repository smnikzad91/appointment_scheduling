import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getSalonBySlug } from "@/lib/api/salons";

export const alt = "صفحه سالن";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function SalonOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  // next/og's fetch(new URL(..., import.meta.url)) pattern doesn't work here — Node's
  // fetch() has no support for file: URLs — so read the fonts from disk directly.
  // Satori (next/og's renderer) also can't parse woff2, so this uses plain TTF weights
  // instead of the variable woff2 the actual page uses.
  const fontsDir = join(process.cwd(), "src/fonts/vazirmatn");
  const [regular, bold] = await Promise.all([
    readFile(join(fontsDir, "Vazirmatn-Regular.ttf")),
    readFile(join(fontsDir, "Vazirmatn-Bold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${salon?.brandColor ?? "#d6336c"} 0%, #1a1a2e 100%)`,
          fontFamily: "Vazirmatn",
          direction: "rtl",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 120,
            height: 120,
            borderRadius: 28,
            background: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            color: "white",
            marginBottom: 32,
          }}
        >
          {salon?.name.slice(0, 1) ?? "س"}
        </div>
        <div style={{ display: "flex", fontSize: 56, color: "white", fontWeight: 700 }}>{salon?.name ?? "سالن زیبایی"}</div>
        {salon && (
          <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.85)", marginTop: 16 }}>
            {salon.city} · رزرو آنلاین نوبت
          </div>
        )}
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Vazirmatn", data: regular, weight: 400, style: "normal" },
        { name: "Vazirmatn", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
