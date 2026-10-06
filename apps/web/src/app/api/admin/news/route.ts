import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyNews, telegramConfigured } from "@/lib/telegram";
import { logError } from "@/lib/errorLog";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.newsItem.findMany({ orderBy: { publishedAt: "desc" } });

  return NextResponse.json(
    items.map((n) => ({
      id:          n.id,
      category:    n.category,
      hashtags:    n.hashtags ?? [],
      title:       n.title,
      body:        n.body,
      image:       n.image ?? undefined,
      coverImage:  n.coverImage ?? undefined,
      highlight:   n.highlight,
      published:   n.published,
      publishedAt: n.publishedAt,
      createdAt:   n.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { category, hashtags, title, body: text, image, coverImage, highlight, published, publishedAt } = body;

  if (!category || !title || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (highlight) await prisma.newsItem.updateMany({ data: { highlight: false } });
  const item = await prisma.newsItem.create({
    data: {
      category,
      hashtags: hashtags ?? [],
      title,
      body: text,
      image: image ?? undefined,
      coverImage: coverImage ?? undefined,
      highlight: highlight ?? false,
      published: published ?? true,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    },
  });

  if (item.published) {
    if (telegramConfigured()) notifyNews({ id: item.id, title: item.title, hashtags: item.hashtags ?? [], coverImage: item.coverImage ?? undefined }).catch((error) => logError({ error, path: "/api/admin/news", context: { action: "notifyNews" } }));
  }

  return NextResponse.json({ id: item.id }, { status: 201 });
}
