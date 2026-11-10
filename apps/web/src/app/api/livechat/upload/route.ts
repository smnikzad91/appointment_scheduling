import { cookies } from "next/headers";
import { after } from "next/server";
import { answerLiveChat } from "@/lib/livechat/ai";
import { sameOrigin } from "@/lib/livechat/config";
import { CHAT_COOKIE, chatByToken, cleanText, outMessage, visitorSend } from "@/lib/livechat/chats";
import { CHAT_UPLOAD_MAX_BYTES, ChatImageError, saveChatImage } from "@/lib/livechat/images";
import { allowSend } from "@/lib/livechat/rateLimit";
import { logError } from "@/lib/errorLog";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

/** POST multipart {file, caption?}: the visitor sends an image (a JPEG the widget made). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const chat = await chatByToken((await cookies()).get(CHAT_COOKIE)?.value);
  if (!chat || chat.endedByVisitor) return fail("گفتگو پیدا نشد؛ گفتگوی تازه‌ای شروع کنید.", 404);
  if (chat.closedAt) return fail("این گفتگو بسته شده است؛ گفتگوی تازه‌ای شروع کنید.", 409);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("تصویری انتخاب نشد.");
  if (file.size > CHAT_UPLOAD_MAX_BYTES) return fail("حجم تصویر زیاد است.", 413);
  if (!allowSend(chat.id)) return fail("پیام‌ها خیلی پشت سر هم است؛ چند ثانیه صبر کنید.", 429);
  try {
    const img = await saveChatImage(chat.id, Buffer.from(await file.arrayBuffer()));
    const { row, delivered } = await visitorSend(chat, cleanText(form?.get("caption")), img);
    after(() => answerLiveChat(chat.id)); // a caption is answered; an image alone gets a short note
    return Response.json({ message: outMessage(row), delivered });
  } catch (error) {
    if (error instanceof ChatImageError) return fail(error.message);
    await logError({ error, path: "/api/livechat/upload" });
    return fail("ارسال تصویر ناموفق بود.", 500);
  }
}
