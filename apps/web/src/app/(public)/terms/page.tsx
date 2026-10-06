import { Metadata } from "next";
import LegalPageClient from "@/components/public/LegalPageClient";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "شرایط استفاده",
  description: "شرایط و ضوابط استفاده از خدمات نوبتت.",
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: "شرایط استفاده | نوبتت",
    description: "شرایط و ضوابط استفاده از خدمات نوبتت.",
    url: `${SITE_URL}/terms`,
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "شرایط استفاده نوبتت" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "شرایط استفاده | نوبتت",
    description: "شرایط و ضوابط استفاده از خدمات نوبتت.",
    images: ["/opengraph-image"],
  },
};

export default function TermsPage() {
  return <LegalPageClient type="terms" />;
}
