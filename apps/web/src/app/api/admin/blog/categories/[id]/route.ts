import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const cat = await prisma.blogCategory.findUnique({ where: { id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldName = cat.name;
  const newName = name.trim();
  await prisma.blogCategory.update({
    where: { id },
    data: { name: newName, description: description?.trim() ?? "" },
  });

  // rename category on all posts that used the old name
  if (oldName !== newName) {
    await prisma.blogPost.updateMany({ where: { category: oldName }, data: { category: newName } });
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
    await prisma.blogCategory.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
