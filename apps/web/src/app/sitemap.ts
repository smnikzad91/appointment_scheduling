import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { salonApiFetch } from "@/lib/api/salonApiClient";
import { SITE_URL } from "@/lib/site";

const BASE_URL = SITE_URL;

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogPosts, newsItems] = await Promise.all([
    prisma.blogPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true, createdAt: true } }),
    prisma.newsItem.findMany({ where: { published: true }, select: { id: true, publishedAt: true, updatedAt: true } }),
  ]);

  // Salons are owned by apps/api — list the active ones through it. A sitemap shouldn't 500
  // just because the API is briefly unreachable, so fall back to the other routes.
  const salons = await salonApiFetch<{ slug: string; updatedAt: string }[]>("/salons").catch((err) => {
    console.error("[sitemap] could not list salons", err);
    return [];
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/news`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: (p.updatedAt ?? p.createdAt) as Date,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const newsRoutes: MetadataRoute.Sitemap = newsItems.map((n) => ({
    url: `${BASE_URL}/news/${n.id}`,
    lastModified: n.updatedAt ?? n.publishedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const salonRoutes: MetadataRoute.Sitemap = salons.map((salon) => ({
    url: `${BASE_URL}/s/${salon.slug}`,
    lastModified: new Date(salon.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...salonRoutes, ...blogRoutes, ...newsRoutes];
}
