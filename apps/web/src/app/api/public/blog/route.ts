import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: { slug: true, category: true, title: true, excerpt: true, createdAt: true, readTime: true },
  });

  return NextResponse.json(
    posts.map((p) => ({
      slug:     p.slug,
      category: p.category,
      title:    p.title,
      excerpt:  p.excerpt,
      createdAt: p.createdAt,
      readTime: p.readTime,
    }))
  );
}
