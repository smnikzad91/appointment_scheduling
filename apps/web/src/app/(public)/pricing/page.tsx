import { Metadata } from "next";
import PricingPageClient from "@/components/public/PricingPageClient";

export const metadata: Metadata = {
  title: "قیمت‌گذاری",
  description: "تعرفه‌های ساده و شفاف برای بروکر MQTT. پلن رایگان، حرفه‌ای و سازمانی متناسب با تعداد دستگاه‌های شما.",
  keywords: ["قیمت‌گذاری", "تعرفه", "پلن رایگان", "قیمت بروکر MQTT", "تعرفه MQTT", "mqttcloud"],
  alternates: { canonical: "https://mqttcloud.ir/pricing" },
  openGraph: {
    title: "قیمت‌گذاری | mqttcloud.ir",
    description: "تعرفه‌های ساده و شفاف برای بروکر MQTT. پلن رایگان، حرفه‌ای و سازمانی.",
    url: "https://mqttcloud.ir/pricing",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "قیمت‌گذاری mqttcloud.ir" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "قیمت‌گذاری | mqttcloud.ir",
    description: "تعرفه‌های ساده و شفاف برای بروکر MQTT.",
    images: ["/opengraph-image"],
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
