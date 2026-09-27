import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyAnnouncement } from "@/lib/telegram";

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body     = await req.json();
  const previous = await prisma.announcement.findUnique({ where: { id } });
  if (!previous) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.announcement.update({ where: { id }, data: body });

  // Notify when toggling to active
  if (body.active === true && !previous.active) {
    void notifyAnnouncement({ text: item.text, emoji: item.emoji, link: item.link, linkText: item.linkText });
  }

  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.announcement.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
