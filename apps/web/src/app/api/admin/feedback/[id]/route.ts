import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ id: string }> }

async function isAdmin() {
  const session = await auth();
  return session?.user?.id && session.user.role === "PLATFORM_ADMIN";
}

/** PATCH {read: boolean}: mark read / unread. */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.read !== "boolean") return NextResponse.json({ error: "read is required" }, { status: 400 });
  const { count } = await prisma.feedback.updateMany({ where: { id }, data: { readAt: body.read ? new Date() : null } });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.feedback.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
