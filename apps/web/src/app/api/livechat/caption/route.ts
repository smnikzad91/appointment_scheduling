import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/livechat/config";
import { allowCaptionEdit } from "@/lib/livechat/captionLimit";
import { CHAT_COOKIE, chatByToken, cleanText, editImageCaption } from "@/lib/livechat/chats";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

/** POST {id, caption}: the visitor changes the caption of an image they sent ("" removes it). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const chat = await chatByToken((await cookies()).get(CHAT_COOKIE)?.value);
  if (!chat) return fail("گفتگو پیدا نشد.", 404);
  if (chat.closedAt) return fail("این گفتگو بسته شده است.");
  const body = (await req.json().catch(() => null)) as { id?: unknown; caption?: unknown } | null;
  const id = typeof body?.id === "string" && /^[a-z0-9]{10,40}$/.test(body.id) ? body.id : null;
  if (!id || typeof body?.caption !== "string") return fail("درخواست نامعتبر است.");
  if (!allowCaptionEdit(chat.id)) return fail("ویرایش‌ها زیاد بود؛ کمی بعد دوباره امتحان کنید.", 429);
  const text = await editImageCaption(chat, id, "VISITOR", cleanText(body.caption));
  return text === null ? fail("این تصویر را نمی‌شود ویرایش کرد.", 404) : Response.json({ text });
}
