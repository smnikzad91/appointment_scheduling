import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CHAT_COOKIE, chatByToken, chatHistory, messagesAfter } from "@/lib/livechat/chats";
import { TYPING_MS } from "@/lib/livechat/rules";

/**
 * GET ?after=<ISO of the newest message the widget has>: what changed in this browser's conversation.
 * Without `after` it's the whole recent history (the widget's first load). Each call also marks the
 * visitor as on the site («الان در سایت» for support). 404 = no conversation (cookie gone / ended).
 */
export async function GET(req: Request) {
  const chat = await chatByToken((await cookies()).get(CHAT_COOKIE)?.value);
  if (!chat || chat.endedByVisitor) return Response.json({ error: "no chat" }, { status: 404 });
  const raw = new URL(req.url).searchParams.get("after");
  const after = raw ? new Date(raw) : null;
  const valid = after && !Number.isNaN(after.getTime());
  const [messages] = await Promise.all([
    valid ? messagesAfter(chat.id, after) : chatHistory(chat.id),
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
      messages,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
