import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CHAT_COOKIE, chatByToken, chatHistory, messagesSince } from "@/lib/livechat/chats";
import { TYPING_MS } from "@/lib/livechat/rules";

/**
 * GET ?since=<serverTime of the widget's previous poll>: messages new or changed since then (new replies,
 * reactions, caption edits), merged by id on the widget. Without `since` it's the whole recent history
 * (the first load). Each call also marks the visitor as on the site («الان در سایت» for support).
 * 404 = no conversation (cookie gone / ended).
 */
export async function GET(req: Request) {
  const chat = await chatByToken((await cookies()).get(CHAT_COOKIE)?.value);
  if (!chat || chat.endedByVisitor) return Response.json({ error: "no chat" }, { status: 404 });
  const raw = new URL(req.url).searchParams.get("since");
  const since = raw ? new Date(raw) : null;
  const valid = since && !Number.isNaN(since.getTime());
  // a little overlap, so a change saved while the previous poll was running isn't missed
  const serverTime = new Date(Date.now() - 1500);
  const [messages] = await Promise.all([
    valid ? messagesSince(chat.id, since) : chatHistory(chat.id),
    prisma.liveChat.update({ where: { id: chat.id }, data: { visitorSeenAt: new Date() } }),
  ]);
  return Response.json(
    {
      code: chat.code,
      name: chat.name,
      closed: Boolean(chat.closedAt),
      supportReadAt: chat.supportReadAt?.toISOString() ?? null,
      typing: Boolean(chat.supportTypingAt && Date.now() - chat.supportTypingAt.getTime() < TYPING_MS),
      imagesPurgedAt: chat.imagesPurgedAt?.toISOString() ?? null,
      rating: chat.rating,
      messages,
      serverTime: serverTime.toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
