import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/livechat/config";
import { CHAT_COOKIE, chatByToken } from "@/lib/livechat/chats";
import { requestHandover } from "@/lib/livechat/ai";

/** POST: «💬 گفتگو با پشتیبان انسانی» — the AI steps aside and support is alerted (Telegram + a short SMS). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const chat = await chatByToken((await cookies()).get(CHAT_COOKIE)?.value);
  if (!chat || chat.endedByVisitor) return Response.json({ error: "گفتگویی پیدا نشد؛ اول پیامتان را بفرستید." }, { status: 404 });
  const r = await requestHandover(chat);
  return r.ok ? Response.json({ ok: true, repeated: r.repeated }) : Response.json({ error: r.error }, { status: 409 });
}
