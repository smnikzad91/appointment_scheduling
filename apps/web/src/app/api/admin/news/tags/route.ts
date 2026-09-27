import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tags = await prisma.newsTag.findMany({ orderBy: { name: "asc" } });

  const withCount = await Promise.all(
    tags.map(async (tag) => ({
      id:          tag.id,
      name:        tag.name,
      description: tag.description,
      itemCount:   await prisma.newsItem.count({ where: { category: tag.name } }),
      createdAt:   tag.createdAt,
    }))
  );

  return NextResponse.json(withCount);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const existing = await prisma.newsTag.findUnique({ where: { name: name.trim() } });
  if (existing) return NextResponse.json({ error: "Tag already exists" }, { status: 409 });

  const tag = await prisma.newsTag.create({ data: { name: name.trim(), description: description?.trim() ?? "" } });
  return NextResponse.json({ id: tag.id, name: tag.name }, { status: 201 });
}
