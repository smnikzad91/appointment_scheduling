import { Metadata } from "next";
import LegalPageClient from "@/components/public/LegalPageClient";

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description: "سیاست حریم خصوصی mqttcloud.ir — چگونه اطلاعات شما را جمع‌آوری، استفاده و حفاظت می‌کنیم.",
  alternates: { canonical: "https://mqttcloud.ir/privacy" },
  openGraph: {
    title: "حریم خصوصی | mqttcloud.ir",
    description: "سیاست حریم خصوصی mqttcloud.ir.",
    url: "https://mqttcloud.ir/privacy",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "حریم خصوصی mqttcloud.ir" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "حریم خصوصی | mqttcloud.ir",
    description: "سیاست حریم خصوصی mqttcloud.ir.",
    images: ["/opengraph-image"],
  },
};

export default function PrivacyPage() {
  return <LegalPageClient type="privacy" />;
}
