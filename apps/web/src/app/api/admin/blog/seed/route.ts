import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { blogPosts } from "@/data/blogPosts";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let inserted = 0;
  let skipped = 0;

  for (const post of blogPosts) {
    const exists = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (exists) { skipped++; continue; }
    await prisma.blogPost.create({
      data: {
        slug: post.slug,
        category: post.category,
        title: post.title,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        readTime: post.readTime,
        hashtags: post.hashtags ?? [],
        sections: post.sections ?? [],
        highlight: post.highlight ?? false,
        published: true,
        ...(post.createdAt ? { createdAt: new Date(post.createdAt) } : {}),
      },
    });
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
