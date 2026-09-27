import { Metadata } from "next";
import HomePageClient from "@/components/public/HomePageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { prisma } from "@/lib/prisma";
import type { SocialPlatform } from "@/types/content";

export const dynamic = "force-dynamic";

const defaultSeo = {
  title: "mqttcloud.ir — بروکر MQTT ابری برای دستگاه‌های شما",
  description: "mqttcloud.ir یک بروکر MQTT امن و مقیاس‌پذیر است. اکانت و دستگاه بسازید، با TLS متصل شوید و پیام‌ها را بی‌درنگ بین دستگاه‌های خود منتشر و دریافت کنید.",
  keywords: ["بروکر MQTT", "MQTT ابری", "IoT", "اتصال دستگاه", "پیام‌رسانی بی‌درنگ", "pub sub", "MQTT broker", "mqttcloud"],
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = await prisma.siteSeo.findFirst();

  const title = seo?.title || defaultSeo.title;
  const description = seo?.description || defaultSeo.description;
  const keywords = seo?.keywords?.length ? seo.keywords : defaultSeo.keywords;

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: "https://mqttcloud.ir" },
    openGraph: {
      title,
      description,
      url: "https://mqttcloud.ir",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "mqttcloud.ir" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function HomePage() {
  const [rawBlog, rawNews, rawSocial, rawFaqs] = await Promise.all([
    prisma.blogPost.findFirst({
      where: { highlight: true, published: true },
      select: { slug: true, category: true, title: true, excerpt: true, coverImage: true, readTime: true },
    }),
    prisma.newsItem.findFirst({
      where: { highlight: true, published: true },
      select: { id: true, category: true, title: true, body: true, image: true, publishedAt: true },
    }),
    prisma.socialLink.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, platform: true, url: true, label: true },
    }),
    prisma.faq.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { question: true, answer: true },
    }),
  ]);

  const featuredBlog = rawBlog
    ? {
        slug:      rawBlog.slug,
        category:  rawBlog.category,
        title:     rawBlog.title,
        excerpt:   rawBlog.excerpt,
        coverImage: rawBlog.coverImage ?? undefined,
        readTime:  rawBlog.readTime,
      }
    : null;

  const featuredNews = rawNews
    ? {
        id:          rawNews.id,
        category:    rawNews.category,
        title:       rawNews.title,
        body:        rawNews.body,
        image:       rawNews.image ?? undefined,
        publishedAt: rawNews.publishedAt.toISOString(),
      }
    : null;

  const socialLinks = rawSocial.map((l) => ({
    id: l.id,
    platform: l.platform.toLowerCase() as SocialPlatform,
    url: l.url,
    label: l.label,
  }));

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
      <HomePageClient featuredBlog={featuredBlog} featuredNews={featuredNews} socialLinks={socialLinks} />
    </>
  );
}
