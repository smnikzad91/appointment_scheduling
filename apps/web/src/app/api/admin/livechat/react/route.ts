import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { isReaction } from "@/lib/livechat/reactions";
import { setImageReaction } from "@/lib/livechat/chats";

/** POST {id, reaction}: support reacts to an image from the panel (null removes it); the visitor's widget picks it up. */
export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await adminSession())) return new Response(null, { status: 403 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; reaction?: unknown } | null;
  const id = typeof body?.id === "string" && /^[a-z0-9]{10,40}$/.test(body.id) ? body.id : null;
  const reaction = body?.reaction === null ? null : isReaction(body?.reaction) ? body.reaction : undefined;
  if (!id || reaction === undefined) return new Response(null, { status: 400 });
  const msg = await prisma.liveChatMessage.findUnique({ where: { id }, select: { chatId: true, chat: { select: { closedAt: true } } } });
  if (!msg || msg.chat.closedAt) return new Response(null, { status: 404 });
  const reactions = await setImageReaction(msg.chatId, id, "support", reaction);
  return reactions ? Response.json({ reactions }) : new Response(null, { status: 404 });
}
