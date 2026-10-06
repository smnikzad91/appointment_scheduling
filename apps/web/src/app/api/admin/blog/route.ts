import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyBlog, telegramConfigured } from "@/lib/telegram";
import { logError } from "@/lib/errorLog";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });

  return NextResponse.json(
    posts.map((p) => ({
      id:          p.id,
      slug:        p.slug,
      title:       p.title,
      category:    p.category,
      excerpt:     p.excerpt,
      coverImage:  p.coverImage ?? undefined,
      readTime:    p.readTime,
      sections:    p.sections,
      published:   p.published,
      highlight:   p.highlight ?? false,
      hashtags:    p.hashtags ?? [],
      createdAt:   p.createdAt,
      updatedAt:   p.updatedAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { slug, category, title, excerpt, readTime, hashtags, sections, highlight, published } = body;

  if (!slug || !category || !title || !excerpt || !readTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  if (highlight) await prisma.blogPost.updateMany({ data: { highlight: false } });
  const post = await prisma.blogPost.create({
    data: {
      slug, category, title, excerpt, readTime,
      hashtags: hashtags ?? [],
      sections: sections ?? [],
      highlight: highlight ?? false,
      published: published ?? true,
    },
  });

  if (post.published) {
    if (telegramConfigured()) notifyBlog({ slug: post.slug, title: post.title, category: String(post.category), excerpt: post.excerpt, hashtags: post.hashtags ?? [], coverImage: post.coverImage ?? undefined }).catch((error) => logError({ error, path: "/api/admin/blog", context: { action: "notifyBlog" } }));
  }

  return NextResponse.json({ id: post.id, slug: post.slug }, { status: 201 });
}
