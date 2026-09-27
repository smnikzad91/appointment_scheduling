import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@appointment-scheduling/database";

function toPrismaRole(role: string): Role {
  return role === "admin" ? Role.PLATFORM_ADMIN : Role.CUSTOMER;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { role, phone } = body;

  const update: Record<string, unknown> = {};
  if (role !== undefined) update.role = toPrismaRole(role);
  if (phone !== undefined) update.phone = phone;

  try {
    await prisma.user.update({ where: { id }, data: update });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025")
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.deleteMany({ where: { id } });

  return NextResponse.json({ ok: true });
}
