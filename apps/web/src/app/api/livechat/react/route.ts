import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/livechat/config";
import { isReaction } from "@/lib/livechat/reactions";
import { CHAT_COOKIE, chatByToken, setImageReaction } from "@/lib/livechat/chats";

/** POST {id, reaction}: the visitor reacts to an image in their open conversation (❤️ 👍 …; null removes it). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  const chat = await chatByToken((await cookies()).get(CHAT_COOKIE)?.value);
  if (!chat || chat.closedAt) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; reaction?: unknown } | null;
  const id = typeof body?.id === "string" && /^[a-z0-9]{10,40}$/.test(body.id) ? body.id : null;
  const reaction = body?.reaction === null ? null : isReaction(body?.reaction) ? body.reaction : undefined;
  if (!id || reaction === undefined) return new Response(null, { status: 400 });
  const reactions = await setImageReaction(chat.id, id, "visitor", reaction);
  return reactions ? Response.json({ reactions }) : new Response(null, { status: 404 });
}
