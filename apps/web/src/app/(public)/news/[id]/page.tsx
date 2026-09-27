import { notFound } from "next/navigation";
import { Metadata } from "next";
import NewsPostClient from "@/components/public/NewsPostClient";
import { JsonLd } from "@/components/common/JsonLd";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function stripMarkdown(text: string) {
  return text.replace(/[#*_`~>[\]]/g, "").replace(/\n+/g, " ").trim().slice(0, 160);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await prisma.newsItem.findFirst({ where: { id, published: true } }).catch(() => null);
  if (!item) return {};

  const url = `${SITE_URL}/news/${id}`;
  const description = stripMarkdown(item.body);
  const image = item.coverImage ?? item.image ?? "/opengraph-image";
  const keywords = [item.category, ...(item.hashtags ?? [])].filter(Boolean);
  const publishedTime = item.publishedAt ? item.publishedAt.toISOString() : undefined;

  return {
    title: item.title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: item.title,
      description,
      url,
      type: "article",
      publishedTime,
      authors: ["نوبتا"],
      tags: keywords,
      images: [{ url: image, width: 1200, height: 630, alt: item.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: [image],
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { id } = await params;

  const raw = await prisma.newsItem.findFirst({ where: { id, published: true } }).catch(() => null);
  if (!raw) notFound();

  const item = {
    id:          raw.id,
    category:    raw.category,
    hashtags:    raw.hashtags ?? [],
    title:       raw.title,
    body:        raw.body,
    image:       raw.image ?? undefined,
    coverImage:  raw.coverImage ?? undefined,
    highlight:   raw.highlight,
    publishedAt: raw.publishedAt ? raw.publishedAt.toISOString() : undefined,
  };

  const relatedRaw = await prisma.newsItem.findMany({
    where: { id: { not: raw.id }, published: true },
    orderBy: { publishedAt: "desc" },
    take: 4,
    select: { id: true, category: true, title: true, image: true, highlight: true, publishedAt: true },
  });

  const related = relatedRaw.map((n) => ({
    id:          n.id,
    category:    n.category,
    title:       n.title,
    image:       n.image ?? undefined,
    highlight:   n.highlight,
    publishedAt: n.publishedAt ? n.publishedAt.toISOString() : undefined,
  }));

  const url = `${SITE_URL}/news/${item.id}`;
  const image = item.coverImage ?? item.image;
  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title,
    description: stripMarkdown(item.body),
    image: image ? [image] : undefined,
    datePublished: item.publishedAt,
    dateModified: item.publishedAt,
    author: { "@type": "Organization", name: "نوبتا", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "نوبتا",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/images/logo/logo-icon.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "اخبار", item: `${SITE_URL}/news` },
      { "@type": "ListItem", position: 3, name: item.title, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={newsArticleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <NewsPostClient item={item} related={related} />
    </>
  );
}
