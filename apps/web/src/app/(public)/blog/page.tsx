import { Metadata } from "next";
import { seoMetadata } from "@/lib/pageSeo";
import BlogPageClient from "@/components/public/BlogPageClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("blog", "/blog");
}

export default async function BlogPage() {
  const raw = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: { slug: true, category: true, title: true, excerpt: true, readTime: true, hashtags: true, createdAt: true, coverImage: true, highlight: true },
  });

  const posts = raw.map((p) => ({
    slug:        p.slug,
    category:    p.category,
    title:       p.title,
    excerpt:     p.excerpt,
    readTime:    p.readTime,
    hashtags:    p.hashtags ?? [],
    createdAt:   p.createdAt ? p.createdAt.toISOString() : undefined,
    coverImage:  p.coverImage ?? undefined,
    highlight:   p.highlight ?? false,
  }));

  return <BlogPageClient posts={posts} />;
}
