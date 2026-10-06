import { Metadata } from "next";
import LegalPageClient from "@/components/public/LegalPageClient";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description: "سیاست حریم خصوصی نوبتت — چگونه اطلاعات شما را جمع‌آوری، استفاده و حفاظت می‌کنیم.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: "حریم خصوصی | نوبتت",
    description: "سیاست حریم خصوصی نوبتت.",
    url: `${SITE_URL}/privacy`,
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "حریم خصوصی نوبتت" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "حریم خصوصی | نوبتت",
    description: "سیاست حریم خصوصی نوبتت.",
    images: ["/opengraph-image"],
  },
};

export default function PrivacyPage() {
  return <LegalPageClient type="privacy" />;
}
