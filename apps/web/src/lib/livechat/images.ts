import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { CHAT_IMAGE_MAX_MB } from "./rules";
import { jpegSize, pngSize } from "./jpeg";

/**
 * Live chat images. The widget and the admin panel re-encode every picture to a JPEG in the browser
 * (canvas: EXIF rotation applied, metadata such as GPS dropped, ≤1600 px), and Telegram photos are
 * JPEGs already, so the server only accepts JPEG bytes — except for images support sends from Telegram as a
 * file («بدون فشرده‌سازی»), which may also be PNGs (screenshots) and are kept as they are. Kept per conversation under
 * private-uploads/livechat/<chatId>/ (outside public/), served only through /api/livechat/file/<messageId>
 * to that chat's visitor and to admins, and deleted when the conversation closes.
 */
export const CHAT_FILES_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "private-uploads", "livechat");
export const CHAT_IMAGE_MAX_BYTES = CHAT_IMAGE_MAX_MB * 1024 * 1024;
/** What the browser uploads after shrinking (≤900 KB JPEG); anything much bigger did not come from our widget. */
export const CHAT_UPLOAD_MAX_BYTES = 1024 * 1024;

export type ChatImage = { file: string; w: number; h: number };
export class ChatImageError extends Error {}

const ID = /^[a-z0-9]{10,40}$/;

/** Validates (JPEG, or PNG with `allowPng`) and stores; returns the stored image and its bytes (for Telegram). */
export async function saveChatImage(chatId: string, input: Buffer, opts: { allowPng?: boolean } = {}): Promise<{ image: ChatImage; jpeg: Buffer }> {
  if (!ID.test(chatId)) throw new ChatImageError("گفتگو نامعتبر است.");
  if (!input.length) throw new ChatImageError("فایل خالی است.");
  if (input.length > CHAT_IMAGE_MAX_BYTES) throw new ChatImageError(`حجم تصویر زیاد است (حداکثر ${CHAT_IMAGE_MAX_MB.toLocaleString("fa-IR")} مگابایت).`);
  const jpeg = jpegSize(input);
  const png = !jpeg && opts.allowPng ? pngSize(input) : null;
  const size = jpeg ?? png;
  if (!size) throw new ChatImageError(opts.allowPng ? "فایل تصویر قابل خواندن نیست؛ JPG یا PNG بفرستید." : "فایل تصویر قابل خواندن نیست؛ تصویر دیگری بفرستید.");
  const file = `${chatId}/${randomUUID()}.${png ? "png" : "jpg"}`;
  await mkdir(path.join(CHAT_FILES_DIR, chatId), { recursive: true });
  await writeFile(path.join(CHAT_FILES_DIR, file), input);
  return { image: { file, ...size }, jpeg: input };
}

export async function readChatImage(file: string) {
  // always "<chatId>/<uuid>.jpg|png" from our own rows; refuse anything else
  if (!/^[a-z0-9]{10,40}\/[0-9a-f-]{36}\.(jpg|png)$/.test(file)) return null;
  return readFile(path.join(CHAT_FILES_DIR, file)).catch(() => null);
}

export async function removeChatFiles(chatIds: string[]) {
  await Promise.all(chatIds.filter((id) => ID.test(id)).map((id) => rm(path.join(CHAT_FILES_DIR, id), { recursive: true, force: true })));
}

/** The image column, typed. */
export const imageOf = (v: unknown): ChatImage | null => {
  const o = v as Partial<ChatImage> | null;
  return o && typeof o.file === "string" && typeof o.w === "number" && typeof o.h === "number" ? { file: o.file, w: o.w, h: o.h } : null;
};
