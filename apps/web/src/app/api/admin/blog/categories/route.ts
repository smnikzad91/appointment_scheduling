import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const categories = await prisma.blogCategory.findMany({ orderBy: { name: "asc" } });

  // attach post count for each category
  const withCount = await Promise.all(
    categories.map(async (cat) => ({
      id:          cat.id,
      name:        cat.name,
      description: cat.description,
      postCount:   await prisma.blogPost.count({ where: { category: cat.name } }),
      createdAt:   cat.createdAt,
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

  const existing = await prisma.blogCategory.findUnique({ where: { name: name.trim() } });
  if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 409 });

  const cat = await prisma.blogCategory.create({ data: { name: name.trim(), description: description?.trim() ?? "" } });
  return NextResponse.json({ id: cat.id, name: cat.name }, { status: 201 });
}
