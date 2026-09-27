import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyNews } from "@/lib/telegram";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const item = await prisma.newsItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id:          item.id,
    category:    item.category,
    hashtags:    item.hashtags ?? [],
    title:       item.title,
    body:        item.body,
    image:       item.image ?? "",
    coverImage:  item.coverImage ?? "",
    highlight:   item.highlight,
    published:   item.published,
    publishedAt: item.publishedAt,
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.highlight) await prisma.newsItem.updateMany({ where: { id: { not: id } }, data: { highlight: false } });
  const previous = await prisma.newsItem.findUnique({ where: { id } });

  let item;
  try {
    item = await prisma.newsItem.update({ where: { id }, data: body });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Send notification when toggling to published
  if (body.published === true && !previous?.published) {
    notifyNews({ id: item.id, title: item.title, hashtags: item.hashtags ?? [], coverImage: item.coverImage ?? undefined }).catch(console.error);
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
    await prisma.newsItem.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
