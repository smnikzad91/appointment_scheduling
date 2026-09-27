import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, isPrismaNotFound } from "@/lib/prisma";

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const tag = await prisma.newsTag.findUnique({ where: { id } });
  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldName = tag.name;
  const newName = name.trim();

  await prisma.newsTag.update({
    where: { id },
    data: { name: newName, description: description?.trim() ?? "" },
  });

  if (oldName !== newName) {
    await prisma.newsItem.updateMany({ where: { category: oldName }, data: { category: newName } });
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
    await prisma.newsTag.delete({ where: { id } });
  } catch (err) {
    if (isPrismaNotFound(err)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }

  return NextResponse.json({ ok: true });
}
