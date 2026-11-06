import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { adminReply, cleanText, closeChat, visitorOnline } from "@/lib/livechat/chats";
import { imageOf } from "@/lib/livechat/images";

type Ctx = { params: Promise<{ id: string }> };
const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

/** GET: one conversation's transcript and details. */
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await adminSession())) return forbidden();
  const { id } = await params;
  const chat = await prisma.liveChat.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" }, take: 1000 } } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = chat.userId
    ? await prisma.user.findUnique({ where: { id: chat.userId }, select: { id: true, firstName: true, lastName: true, phone: true, role: true } })
    : null;
  const { messages, tokenHash: _secret, ...rest } = chat;
  void _secret;
  return NextResponse.json(
    {
      chat: { ...rest, online: visitorOnline(chat) },
      user,
      messages: messages.map((m) => {
        const image = imageOf(m.image);
        return { id: m.id, sender: m.sender, text: m.text, author: m.author, at: m.createdAt, delivered: m.tgMessageId !== null, image: image ? { w: image.w, h: image.h } : null };
      }),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/** POST {text}: reply from the panel. */
export async function POST(req: Request, { params }: Ctx) {
  if (!sameOrigin(req)) return forbidden();
  const admin = await adminSession();
  if (!admin) return forbidden();
  const { id } = await params;
  const chat = await prisma.liveChat.findUnique({ where: { id } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = cleanText(body?.text, 2000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const error = await adminReply(chat, text, admin.author);
  return error ? NextResponse.json({ error }, { status: 409 }) : NextResponse.json({ ok: true });
}

/** PATCH {action: "close"}: support closes the conversation (its images are deleted). */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!sameOrigin(req)) return forbidden();
  if (!(await adminSession())) return forbidden();
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  if (body?.action !== "close") return NextResponse.json({ error: "bad action" }, { status: 400 });
  const chat = await prisma.liveChat.findUnique({ where: { id } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await closeChat(chat);
  return NextResponse.json({ ok: true });
}
