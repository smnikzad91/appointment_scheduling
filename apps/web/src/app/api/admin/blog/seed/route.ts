import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { blogCategories, blogPosts } from "@/data/blogPosts";

// Inserts the articles of src/data/blogPosts.ts missing from the database — as drafts: the admin
// reviews and publishes each one. Their categories are created when missing.

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  for (const c of blogCategories) {
    await prisma.blogCategory.upsert({ where: { name: c.name }, create: c, update: {} });
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
        published: false,
        ...(post.createdAt ? { createdAt: new Date(post.createdAt) } : {}),
      },
    });
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
