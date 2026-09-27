import { Metadata } from "next";
import BlogPageClient from "@/components/public/BlogPageClient";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "وبلاگ",
  description: "راهنمای مدیریت سالن زیبایی، جذب مشتری و نوبت‌دهی آنلاین. مقالات کاربردی برای صاحبان سالن و آرایشگرها.",
  keywords: ["وبلاگ", "مدیریت سالن زیبایی", "نوبت‌دهی آنلاین", "آرایشگاه", "نوبتا"],
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "وبلاگ | نوبتا",
    description: "راهنمای مدیریت سالن زیبایی و نوبت‌دهی آنلاین.",
    url: `${SITE_URL}/blog`,
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "وبلاگ نوبتا" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "وبلاگ | نوبتا",
    description: "راهنمای مدیریت سالن زیبایی و نوبت‌دهی آنلاین.",
    images: ["/opengraph-image"],
  },
};

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
