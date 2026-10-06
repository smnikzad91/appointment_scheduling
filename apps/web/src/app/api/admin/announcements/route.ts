import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyAnnouncement, telegramConfigured } from "@/lib/telegram";
import { logError } from "@/lib/errorLog";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.announcement.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const item = await prisma.announcement.create({
    data: {
      text: body.text,
      link: body.link ?? "",
      linkText: body.linkText ?? "",
      emoji: body.emoji ?? "🎉",
      active: body.active ?? true,
      order: body.order ?? 0,
    },
  });

  if (item.active) {
    if (telegramConfigured()) notifyAnnouncement({ text: item.text, emoji: item.emoji, link: item.link, linkText: item.linkText }).catch((error) => logError({ error, path: "/api/admin/announcements", context: { action: "notifyAnnouncement" } }));
  }

  return NextResponse.json(item, { status: 201 });
}
