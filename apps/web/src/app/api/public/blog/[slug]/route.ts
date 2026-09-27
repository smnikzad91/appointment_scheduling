import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const post = await prisma.blogPost.findFirst({ where: { slug, published: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    slug:     post.slug,
    category: post.category,
    title:    post.title,
    excerpt:  post.excerpt,
    createdAt: post.createdAt,
    readTime: post.readTime,
    sections: post.sections,
  });
}
