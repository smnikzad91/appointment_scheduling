/** Live chat limits and texts shared by the widget, the admin panel and the server. */

export const MESSAGE_MAX = 1000;
export const CHAT_IMAGE_MAX_MB = 10;
export const CHAT_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.heic,.heif,image/*";
export const CHAT_IMAGE_RULE_FA = `JPG، PNG، WebP یا GIF، حداکثر ${CHAT_IMAGE_MAX_MB.toLocaleString("fa-IR")} مگابایت`;
/** What an image message turns into once its conversation is closed and the file is deleted. */
export const CHAT_IMAGE_DELETED = "📷 تصویر حذف شد";
export const withoutImage = (text: string) => (text ? `${CHAT_IMAGE_DELETED}\n${text}` : CHAT_IMAGE_DELETED);

/** The visitor counts as «الان در سایت» while their widget asked for news within this long. */
export const ONLINE_MS = 45_000;
/** «پشتیبانی در حال نوشتن…» shows while the panel's last typing ping is this recent. */
export const TYPING_MS = 6_000;

/** Wire shape of a message (never the Telegram author or ids). */
export type ChatMessageOut = { id: string; sender: "visitor" | "admin" | "system"; text: string; at: string; image: { w: number; h: number } | null };

/** Returns a Persian error, or null when the picked file may be sent (it's re-encoded to JPEG in the browser). */
export function chatImageProblem(file: { type?: string; name?: string; size: number }): string | null {
  const isImage = (file.type ?? "").startsWith("image/") || /\.(jpe?g|png|webp|gif|hei[cf])$/i.test(file.name ?? "");
  if (!isImage) return "فقط فایل تصویری می‌شود فرستاد.";
  if (!file.size) return "فایل خالی است.";
  if (file.size > CHAT_IMAGE_MAX_MB * 1024 * 1024) return `حجم تصویر بیشتر از ${CHAT_IMAGE_MAX_MB.toLocaleString("fa-IR")} مگابایت است.`;
  return null;
}
