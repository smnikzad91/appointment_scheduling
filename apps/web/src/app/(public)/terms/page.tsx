import { Metadata } from "next";
import LegalPageClient from "@/components/public/LegalPageClient";

export const metadata: Metadata = {
  title: "شرایط استفاده",
  description: "شرایط و ضوابط استفاده از خدمات mqttcloud.ir.",
  alternates: { canonical: "https://mqttcloud.ir/terms" },
  openGraph: {
    title: "شرایط استفاده | mqttcloud.ir",
    description: "شرایط و ضوابط استفاده از خدمات mqttcloud.ir.",
    url: "https://mqttcloud.ir/terms",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "شرایط استفاده mqttcloud.ir" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "شرایط استفاده | mqttcloud.ir",
    description: "شرایط و ضوابط استفاده از خدمات mqttcloud.ir.",
    images: ["/opengraph-image"],
  },
};

export default function TermsPage() {
  return <LegalPageClient type="terms" />;
}
