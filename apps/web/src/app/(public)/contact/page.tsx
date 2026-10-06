import { Metadata } from "next";
import ContactPageClient from "@/components/public/ContactPageClient";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "تماس با ما",
  description: "سوال، پیشنهاد یا مشکل دارید؟ از طریق فرم تماس با تیم نوبتت در ارتباط باشید.",
  keywords: ["تماس با ما", "پشتیبانی", "ارتباط", "نوبتت"],
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: "تماس با ما | نوبتت",
    description: "سوال، پیشنهاد یا مشکل دارید؟ با ما در تماس باشید.",
    url: `${SITE_URL}/contact`,
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "تماس با ما نوبتت" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "تماس با ما | نوبتت",
    description: "سوال، پیشنهاد یا مشکل دارید؟ با ما در تماس باشید.",
    images: ["/opengraph-image"],
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
