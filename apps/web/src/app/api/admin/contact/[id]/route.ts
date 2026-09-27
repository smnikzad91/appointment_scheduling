import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, isPrismaNotFound } from "@/lib/prisma";
import { ContactStatus as PrismaContactStatus } from "@appointment-scheduling/database";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  if (typeof body.status === "string") {
    body.status = body.status.toUpperCase() as PrismaContactStatus;
  }

  try {
    const item = await prisma.contactMessage.update({ where: { id }, data: body });
    return NextResponse.json({ ...item, status: item.status.toLowerCase() });
  } catch (err) {
    if (isPrismaNotFound(err)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.contactMessage.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
