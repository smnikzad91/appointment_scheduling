import { Metadata } from "next";
import NewsPageClient from "@/components/public/NewsPageClient";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "اخبار",
  description: "آخرین اخبار، به‌روزرسانی‌ها و اطلاعیه‌های نوبتا. از جدیدترین امکانات نوبت‌دهی آنلاین سالن‌ها مطلع شوید.",
  keywords: ["اخبار نوبتا", "به‌روزرسانی محصول", "اطلاعیه"],
  alternates: { canonical: `${SITE_URL}/news` },
  openGraph: {
    title: "اخبار | نوبتا",
    description: "آخرین اخبار و اطلاعیه‌های نوبتا.",
    url: `${SITE_URL}/news`,
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "اخبار نوبتا" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "اخبار | نوبتا",
    description: "آخرین اخبار و اطلاعیه‌های نوبتا.",
    images: ["/opengraph-image"],
  },
};

export default async function NewsPage() {
  const raw = await prisma.newsItem.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });

  const news = raw.map((n) => ({
    id:          n.id,
    category:    n.category,
    title:       n.title,
    body:        n.body,
    image:       n.image ?? undefined,
    hashtags:    n.hashtags ?? [],
    highlight:   n.highlight,
    publishedAt: n.publishedAt ? n.publishedAt.toISOString() : undefined,
  }));

  return <NewsPageClient news={news} />;
}
