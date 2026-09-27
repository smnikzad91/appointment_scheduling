import { Metadata } from "next";
import FaqPageClient from "@/components/public/FaqPageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سوالات متداول",
  description: "پاسخ رایج‌ترین سوال‌ها درباره mqttcloud.ir — پلن‌ها، پرداخت، اتصال دستگاه‌ها و پشتیبانی.",
  keywords: ["سوالات متداول", "FAQ", "پشتیبانی", "MQTT", "بروکر", "mqttcloud"],
  alternates: { canonical: "https://mqttcloud.ir/faq" },
  openGraph: {
    title: "سوالات متداول | mqttcloud.ir",
    description: "پاسخ رایج‌ترین سوال‌ها درباره mqttcloud.ir.",
    url: "https://mqttcloud.ir/faq",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "سوالات متداول mqttcloud.ir" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "سوالات متداول | mqttcloud.ir",
    description: "پاسخ رایج‌ترین سوال‌ها درباره mqttcloud.ir.",
    images: ["/opengraph-image"],
  },
};

export default async function FaqPage() {
  const rawFaqs = await prisma.faq.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { question: true, answer: true },
  });

  const faqJsonLd = rawFaqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: rawFaqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <>
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <FaqPageClient />
    </>
  );
}
