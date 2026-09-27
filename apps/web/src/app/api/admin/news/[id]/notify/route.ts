import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyNews } from "@/lib/telegram";
import { logError } from "@/lib/errorLog";

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const item = await prisma.newsItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await notifyNews({ id: item.id, title: item.title, hashtags: item.hashtags ?? [], coverImage: item.coverImage ?? undefined });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Telegram error";
    await logError({ error: err, method: "POST", path: `/api/admin/news/${id}/notify`, statusCode: 500, userId: session.user.id, context: { action: "notifyNews" } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
