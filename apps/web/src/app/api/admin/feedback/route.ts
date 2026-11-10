import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// «نظرات و پیشنهادات» for the platform admin: the latest 300, newest first, plus the unread count.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [items, unread] = await Promise.all([
    prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.feedback.count({ where: { readAt: null } }),
  ]);
  return NextResponse.json({ items, unread });
}
