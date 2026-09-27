import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, isPrismaNotFound } from "@/lib/prisma";
import { notifyBlog } from "@/lib/telegram";
import { logError } from "@/lib/errorLog";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id:          post.id,
    slug:        post.slug,
    category:    post.category,
    title:       post.title,
    excerpt:     post.excerpt,
    coverImage:  post.coverImage ?? "",
    readTime:    post.readTime,
    hashtags:    post.hashtags ?? [],
    sections:    post.sections,
    highlight:   post.highlight,
    published:   post.published,
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.highlight) await prisma.blogPost.updateMany({ where: { id: { not: id } }, data: { highlight: false } });
  const previous = await prisma.blogPost.findUnique({ where: { id } });
  if (!previous) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let post;
  try {
    post = await prisma.blogPost.update({ where: { id }, data: body });
  } catch (err) {
    if (isPrismaNotFound(err)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }

  // Send notification when toggling to published
  if (body.published === true && !previous.published) {
    notifyBlog({ slug: post.slug, title: post.title, category: String(post.category), excerpt: post.excerpt, hashtags: post.hashtags ?? [], readTime: post.readTime ?? undefined, coverImage: post.coverImage ?? undefined }).catch((error) =>
      logError({ error, method: "PUT", path: `/api/admin/blog/${id}`, context: { action: "notifyBlog" } }),
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.blogPost.delete({ where: { id } });
  } catch (err) {
    if (isPrismaNotFound(err)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }

  return NextResponse.json({ ok: true });
}
