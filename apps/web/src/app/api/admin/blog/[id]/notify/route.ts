import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyBlog } from "@/lib/telegram";
import { logError } from "@/lib/errorLog";

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await notifyBlog({
      slug:       post.slug,
      title:      post.title,
      category:   String(post.category),
      excerpt:    post.excerpt,
      hashtags:   post.hashtags ?? [],
      readTime:   post.readTime ?? undefined,
      coverImage: post.coverImage ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Telegram error";
    await logError({ error: err, method: "POST", path: `/api/admin/blog/${id}/notify`, statusCode: 500, userId: session.user.id, context: { action: "notifyBlog" } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
