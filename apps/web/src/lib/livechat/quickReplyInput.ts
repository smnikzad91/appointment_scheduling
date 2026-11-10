import { QUICK_KEY } from "./quickReplies";

export type QuickReplyInput = { key: string; title: string; text: string; keywords: string[]; autoReply: boolean; order: number };

/** Validates a quick reply from the admin panel; returns the clean value or an error key (lcQr…). */
export function parseQuickReply(body: unknown): { ok: true; value: QuickReplyInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const key = String(b.key ?? "").trim().toLowerCase();
  const title = String(b.title ?? "").trim().slice(0, 60);
  const text = String(b.text ?? "").trim().slice(0, 1500);
  const keywords = (Array.isArray(b.keywords) ? b.keywords : String(b.keywords ?? "").split(/[,،\n]/))
    .map((k) => String(k).trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 20);
  const order = Number.isInteger(b.order) ? Math.max(0, Math.min(999, b.order as number)) : 0;
  if (!QUICK_KEY.test(key)) return { ok: false, error: "lcQrKeyInvalid" };
  if (!title || !text) return { ok: false, error: "lcQrRequired" };
  return { ok: true, value: { key, title, text, keywords, autoReply: b.autoReply === true, order } };
}
