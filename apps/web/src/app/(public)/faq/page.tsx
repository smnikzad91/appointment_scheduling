import { Metadata } from "next";
import { seoMetadata } from "@/lib/pageSeo";
import FaqPageClient from "@/components/public/FaqPageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("faq", "/faq");
}

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
