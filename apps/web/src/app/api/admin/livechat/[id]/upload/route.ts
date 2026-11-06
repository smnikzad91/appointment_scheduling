import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { adminReply, cleanText } from "@/lib/livechat/chats";
import { CHAT_UPLOAD_MAX_BYTES, ChatImageError, saveChatImage } from "@/lib/livechat/images";
import { logError } from "@/lib/errorLog";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

/** POST multipart {file, caption?}: support sends an image from the panel (a JPEG the browser made). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const admin = await adminSession();
  if (!admin) return fail("forbidden", 403);
  const chat = await prisma.liveChat.findUnique({ where: { id: (await params).id } });
  if (!chat) return fail("گفتگو پیدا نشد.", 404);
  if (chat.endedByVisitor) return fail("مشتری این گفتگو را بسته؛ پیام به او نمی‌رسد.", 409);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("تصویری انتخاب نشد.");
  if (file.size > CHAT_UPLOAD_MAX_BYTES) return fail("حجم تصویر زیاد است.", 413);
  try {
    const img = await saveChatImage(chat.id, Buffer.from(await file.arrayBuffer()));
    const error = await adminReply(chat, cleanText(form?.get("caption"), 2000), admin.author, img);
    return error ? fail(error, 409) : Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ChatImageError) return fail(error.message);
    await logError({ error, path: "/api/admin/livechat/upload" });
    return fail("ارسال تصویر ناموفق بود.", 500);
  }
}
