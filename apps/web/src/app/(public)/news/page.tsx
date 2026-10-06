import { Metadata } from "next";
import { seoMetadata } from "@/lib/pageSeo";
import NewsPageClient from "@/components/public/NewsPageClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("news", "/news");
}

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
