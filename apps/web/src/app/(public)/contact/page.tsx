import { Metadata } from "next";
import ContactPageClient from "@/components/public/ContactPageClient";

export const metadata: Metadata = {
  title: "تماس با ما",
  description: "سوال، پیشنهاد یا مشکل دارید؟ از طریق فرم تماس با تیم mqttcloud.ir در ارتباط باشید.",
  keywords: ["تماس با ما", "پشتیبانی", "ارتباط", "mqttcloud"],
  alternates: { canonical: "https://mqttcloud.ir/contact" },
  openGraph: {
    title: "تماس با ما | mqttcloud.ir",
    description: "سوال، پیشنهاد یا مشکل دارید؟ با ما در تماس باشید.",
    url: "https://mqttcloud.ir/contact",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "تماس با ما mqttcloud.ir" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "تماس با ما | mqttcloud.ir",
    description: "سوال، پیشنهاد یا مشکل دارید؟ با ما در تماس باشید.",
    images: ["/opengraph-image"],
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
