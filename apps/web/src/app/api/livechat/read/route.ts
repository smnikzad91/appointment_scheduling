import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/livechat/config";
import { CHAT_COOKIE, chatByToken, markVisitorRead } from "@/lib/livechat/chats";

/** POST: the visitor has support's replies on screen (admin transcript: «خوانده شد»). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  const chat = await chatByToken((await cookies()).get(CHAT_COOKIE)?.value);
  if (chat) await markVisitorRead(chat.id);
  return new Response(null, { status: 204 });
}
