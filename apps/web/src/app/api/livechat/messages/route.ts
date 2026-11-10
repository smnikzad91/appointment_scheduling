import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/livechat/config";
import { CHAT_COOKIE, chatByToken, cleanText, imageInChat, outMessage, visitorSend } from "@/lib/livechat/chats";
import { allowSend } from "@/lib/livechat/rateLimit";

const fail = (error: string, status = 400, extra: object = {}) => Response.json({ error, ...extra }, { status });

/** POST {text, replyTo?}: the visitor's next message in their conversation; `replyTo` = an image of the chat it comments on. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const chat = await chatByToken((await cookies()).get(CHAT_COOKIE)?.value);
  if (!chat || chat.endedByVisitor) return fail("گفتگو پیدا نشد؛ گفتگوی تازه‌ای شروع کنید.", 404, { closed: true });
  if (chat.closedAt) return fail("این گفتگو بسته شده است؛ گفتگوی تازه‌ای شروع کنید.", 409, { closed: true });
  const body = (await req.json().catch(() => null)) as { text?: unknown; replyTo?: unknown } | null;
  const text = cleanText(body?.text);
  if (!text) return fail("پیامتان را بنویسید.");
  if (!allowSend(chat.id)) return fail("پیام‌ها خیلی پشت سر هم است؛ چند ثانیه صبر کنید.", 429);
  const about = body?.replyTo ? await imageInChat(chat.id, body.replyTo) : null;
  const { row, delivered } = await visitorSend(chat, text, undefined, about);
  return Response.json({ message: outMessage(row), delivered });
}
