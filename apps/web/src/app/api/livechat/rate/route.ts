import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/livechat/config";
import { CHAT_COOKIE, chatByToken, rateChat } from "@/lib/livechat/chats";

/** POST {rating: 1 | -1}: «راضی بودید؟» once support has closed the conversation (it can be changed). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  const chat = await chatByToken((await cookies()).get(CHAT_COOKIE)?.value);
  if (!chat || chat.endedByVisitor || !chat.closedAt) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { rating?: unknown } | null;
  if (body?.rating !== 1 && body?.rating !== -1) return new Response(null, { status: 400 });
  await rateChat(chat, body.rating);
  return Response.json({ rating: body.rating });
}
