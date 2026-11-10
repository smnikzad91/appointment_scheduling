import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { addMessage, adminReply, cleanText, closeChat, imageInChat, visitorOnline } from "@/lib/livechat/chats";
import { isReaction } from "@/lib/livechat/reactions";
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
        return {
          id: m.id,
          sender: m.sender,
          text: m.text,
          author: m.author,
          at: m.createdAt,
          delivered: m.tgMessageId !== null,
          image: image ? { w: image.w, h: image.h } : null,
          reactions: image ? { visitor: isReaction(m.visitorReaction) ? m.visitorReaction : null, support: isReaction(m.supportReaction) ? m.supportReaction : null } : null,
          edited: m.editedAt !== null,
          replyTo: m.replyToId,
        };
      }),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/** POST {text, replyTo?}: reply from the panel; `replyTo` = an image of the chat it comments on (from the viewer). */
export async function POST(req: Request, { params }: Ctx) {
  if (!sameOrigin(req)) return forbidden();
  const admin = await adminSession();
  if (!admin) return forbidden();
  const { id } = await params;
  const chat = await prisma.liveChat.findUnique({ where: { id } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; replyTo?: unknown } | null;
  const text = cleanText(body?.text, 2000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const about = body?.replyTo ? await imageInChat(chat.id, body.replyTo) : null;
  const error = await adminReply(chat, text, admin.author, undefined, about);
  return error ? NextResponse.json({ error }, { status: 409 }) : NextResponse.json({ ok: true });
}

/**
 * PATCH {action: "close"}: support closes the conversation (its images are deleted).
 * PATCH {action: "ticket"}: turns it into a support ticket for the signed-in visitor (the transcript as its
 * message), to follow up in «پشتیبانی»; the visitor is told in the chat.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!sameOrigin(req)) return forbidden();
  if (!(await adminSession())) return forbidden();
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  const chat = await prisma.liveChat.findUnique({ where: { id } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body?.action === "close") {
    await closeChat(chat);
    return NextResponse.json({ ok: true });
  }
  if (body?.action !== "ticket") return NextResponse.json({ error: "bad action" }, { status: 400 });
  if (chat.ticketId) return NextResponse.json({ ticketId: chat.ticketId });
  const user = chat.userId ? await prisma.user.findUnique({ where: { id: chat.userId }, select: { id: true, deletedAt: true } }) : null;
  if (!user || user.deletedAt) return NextResponse.json({ error: "no account" }, { status: 409 });
  const messages = await prisma.liveChatMessage.findMany({ where: { chatId: chat.id, sender: { not: "SYSTEM" } }, orderBy: { createdAt: "desc" }, take: 60 });
  const who = chat.name || "مشتری";
  const transcript = messages
    .reverse()
    .map((m) => `${m.sender === "VISITOR" ? who : "پشتیبانی"}: ${m.text || (m.image ? "📷 تصویر" : "")}`)
    .join("\n");
  const ticket = await prisma.ticket.create({
    data: { userId: user.id, subject: `گفتگوی آنلاین #${chat.code}`.slice(0, 120), message: `متن گفتگوی آنلاین:\n\n${transcript}`.slice(0, 10_000), images: [] },
  });
  await prisma.liveChat.update({ where: { id: chat.id }, data: { ticketId: ticket.id } });
  if (!chat.endedByVisitor) await addMessage(chat.id, "SYSTEM", "برای پیگیری، یک تیکت پشتیبانی ساخته شد؛ آن را در بخش «پشتیبانی» حساب کاربری‌تان دنبال کنید.");
  return NextResponse.json({ ticketId: ticket.id });
}
