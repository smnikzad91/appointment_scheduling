import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const alt = "نوبتا — سامانه نوبت‌دهی آنلاین سالن‌های زیبایی";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  // Satori needs an explicit font to render Persian, and can't read woff2 — same approach as
  // app/s/[slug]/opengraph-image.tsx.
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
          background: "linear-gradient(135deg, #a34a30 0%, #2a1d26 100%)",
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
            fontSize: 60,
            fontWeight: 700,
            color: "white",
            marginBottom: 32,
          }}
        >
          ن
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "white" }}>{SITE_NAME}</div>
        <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.85)", marginTop: 16 }}>
          سامانه نوبت‌دهی آنلاین سالن‌های زیبایی
        </div>
        <div style={{ display: "flex", fontSize: 18, color: "rgba(255,255,255,0.45)", marginTop: 48 }}>
          {SITE_URL.replace(/^https?:\/\//, "")}
        </div>
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
