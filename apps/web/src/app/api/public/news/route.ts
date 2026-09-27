import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.newsItem.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });

  return NextResponse.json(
    items.map((n) => ({
      id:          n.id,
      category:    n.category,
      hashtags:    n.hashtags ?? [],
      title:       n.title,
      body:        n.body,
      image:       n.image ?? undefined,
      highlight:       n.highlight,
      publishedAt: n.publishedAt,
    }))
  );
}
