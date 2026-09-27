import { Metadata } from "next";
import LegalPageClient from "@/components/public/LegalPageClient";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description: "سیاست حریم خصوصی نوبتا — چگونه اطلاعات شما را جمع‌آوری، استفاده و حفاظت می‌کنیم.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: "حریم خصوصی | نوبتا",
    description: "سیاست حریم خصوصی نوبتا.",
    url: `${SITE_URL}/privacy`,
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "حریم خصوصی نوبتا" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "حریم خصوصی | نوبتا",
    description: "سیاست حریم خصوصی نوبتا.",
    images: ["/opengraph-image"],
  },
};

export default function PrivacyPage() {
  return <LegalPageClient type="privacy" />;
}
