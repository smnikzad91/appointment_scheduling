import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { cleanText, editImageCaption } from "@/lib/livechat/chats";

/** POST {id, caption}: support changes the caption of an image support sent ("" removes it). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = await adminSession();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; caption?: unknown } | null;
  const id = typeof body?.id === "string" && /^[a-z0-9]{10,40}$/.test(body.id) ? body.id : null;
  if (!id || typeof body?.caption !== "string") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const msg = await prisma.liveChatMessage.findUnique({ where: { id }, select: { chat: true } });
  if (!msg) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (msg.chat.closedAt) return NextResponse.json({ error: "closed" }, { status: 409 });
  const text = await editImageCaption(msg.chat, id, "ADMIN", cleanText(body.caption), admin.author);
  return text === null ? NextResponse.json({ error: "not found" }, { status: 404 }) : NextResponse.json({ text });
}
