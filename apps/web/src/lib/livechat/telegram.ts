import https from "node:https";
import { SocksProxyAgent } from "socks-proxy-agent";
import { SITE_URL } from "@/lib/site";
import { botToken, supportChatId, webhookSecret, WEBHOOK_PATH } from "./config";

/** Minimal Telegram Bot API client for the site's live chat (its own bot, not the channel bot in lib/telegram.ts). */

// Telegram is blocked (and its DNS poisoned) on the Iran server, so when TELEGRAM_PROXY is set every
// call goes through that SOCKS proxy, with the proxy resolving the hostname (socks5 → socks5h).
const PROXY = process.env.TELEGRAM_PROXY?.trim().replace(/^socks5:/, "socks5h:");
let proxyAgent: SocksProxyAgent | undefined;

async function tgFetch(url: string, init: { method?: string; headers?: Record<string, string>; body?: string | FormData; timeoutMs: number }): Promise<Response> {
  if (!PROXY) return fetch(url, { method: init.method, headers: init.headers, body: init.body, signal: AbortSignal.timeout(init.timeoutMs) });
  proxyAgent ??= new SocksProxyAgent(PROXY);
  const headers: Record<string, string> = { ...init.headers };
  let body: Buffer | undefined;
  if (init.body instanceof FormData) {
    const encoded = new Response(init.body);
    body = Buffer.from(await encoded.arrayBuffer());
    headers["content-type"] = encoded.headers.get("content-type") ?? "multipart/form-data";
  } else if (init.body != null) {
    body = Buffer.from(init.body);
  }
  if (body) headers["content-length"] = String(body.length);
  return new Promise<Response>((resolve, reject) => {
    const req = https.request(url, { agent: proxyAgent, method: init.method ?? "GET", headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        clearTimeout(timer);
        const status = res.statusCode ?? 502;
        resolve(new Response([204, 205, 304].includes(status) ? null : new Uint8Array(Buffer.concat(chunks)), { status }));
      });
      res.on("error", (e) => { clearTimeout(timer); reject(e); });
    });
    const timer = setTimeout(() => req.destroy(new Error("telegram request timed out")), init.timeoutMs);
    req.on("error", (e) => { clearTimeout(timer); reject(e); });
    if (body) req.write(body);
    req.end();
  });
}

type TgResult<T> = { ok: true; result: T } | { ok: false; description?: string };
export type TgMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string; username?: string; is_bot?: boolean };
  text?: string;
  caption?: string;
  photo?: { file_id: string; width: number; height: number; file_size?: number }[];
  document?: { file_id: string; mime_type?: string; file_size?: number; file_name?: string };
  reply_to_message?: { message_id: number };
};
export type TgUpdate = { update_id: number; message?: TgMessage };

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = botToken();
  if (!token) throw new Error("live chat telegram bot not configured");
  const res = await tgFetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    timeoutMs: 10_000,
  });
  const data = (await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }))) as TgResult<T>;
  if (!data.ok) throw new Error(`telegram ${method}: ${data.description ?? "failed"}`);
  return data.result;
}

/** Escape text for parse_mode HTML. */
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const replyTo = (id?: number | null) => (id ? { reply_parameters: { message_id: id, allow_sending_without_reply: true } } : {});

/** Sends to the support chat; returns the Telegram message id. */
export async function sendToSupport(html: string, replyToId?: number | null) {
  const m = await tg<TgMessage>("sendMessage", {
    chat_id: supportChatId(),
    text: html.slice(0, 4096),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...replyTo(replyToId),
  });
  return m.message_id;
}

/** Sends a photo (JPEG bytes) with an HTML caption to the support chat; returns the message id. */
export async function sendPhotoToSupport(jpeg: Buffer, captionHtml: string, replyToId?: number | null) {
  const form = new FormData();
  form.set("chat_id", supportChatId());
  form.set("photo", new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }), "image.jpg");
  form.set("caption", captionHtml.slice(0, 1024));
  form.set("parse_mode", "HTML");
  if (replyToId) form.set("reply_parameters", JSON.stringify({ message_id: replyToId, allow_sending_without_reply: true }));
  const res = await tgFetch(`https://api.telegram.org/bot${botToken()}/sendPhoto`, { method: "POST", body: form, timeoutMs: 30_000 });
  const data = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; result?: TgMessage; description?: string };
  if (!data.ok || !data.result) throw new Error(`telegram sendPhoto: ${data.description ?? "failed"}`);
  return data.result.message_id;
}

/** Fixed keyboard under the support chat's input: button text → command. */
export const KEYBOARD_COMMANDS: Record<string, string> = {
  "📋 گفتگوهای باز": "/chats",
  "⚡ پاسخ‌های آماده": "/r",
  "🔒 بستن گفتگو": "/close",
  "ℹ️ مشخصات مشتری": "/info",
  "❓ راهنما": "/help",
};
const SUPPORT_KEYBOARD = {
  keyboard: [[{ text: "📋 گفتگوهای باز" }, { text: "⚡ پاسخ‌های آماده" }], [{ text: "🔒 بستن گفتگو" }, { text: "ℹ️ مشخصات مشتری" }], [{ text: "❓ راهنما" }]],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: "Reply روی پیام مشتری و نوشتن جواب",
};

export async function replyIn(chatId: number | string, html: string, replyToId?: number, keyboard = true) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: html.slice(0, 4096),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(keyboard ? { reply_markup: SUPPORT_KEYBOARD } : {}),
    ...replyTo(replyToId),
  });
}

/** A quiet reaction on the support member's message (delivered / seen later). Failures are ignored. */
export function react(chatId: number | string, messageId: number, emoji: string) {
  tg("setMessageReaction", { chat_id: chatId, message_id: messageId, reaction: [{ type: "emoji", emoji }] }).catch(() => {});
}

/** Downloads a photo support sent to the bot (at most `maxBytes`). */
export async function downloadTelegramFile(fileId: string, maxBytes: number) {
  const meta = (await (
    await tgFetch(`https://api.telegram.org/bot${botToken()}/getFile?file_id=${encodeURIComponent(fileId)}`, { timeoutMs: 10_000 })
  ).json()) as { ok: boolean; result?: { file_path?: string; file_size?: number } };
  const p = meta.result?.file_path;
  if (!meta.ok || !p) throw new Error("telegram getFile failed");
  if ((meta.result?.file_size ?? 0) > maxBytes) throw new Error("too large");
  const res = await tgFetch(`https://api.telegram.org/file/bot${botToken()}/${p}`, { timeoutMs: 30_000 });
  if (!res.ok) throw new Error("telegram file download failed");
  return Buffer.from(await res.arrayBuffer());
}

/** Points the bot's webhook at this site and sets its command menu (idempotent; run at startup). */
export async function ensureTelegramWebhook() {
  if (!botToken()) return;
  try {
    await tg("setWebhook", { url: `${SITE_URL.replace(/\/$/, "")}${WEBHOOK_PATH}`, secret_token: webhookSecret(), allowed_updates: ["message"], max_connections: 10 });
    await tg("setMyCommands", {
      commands: [
        { command: "chats", description: "گفتگوهای باز" },
        { command: "close", description: "بستن گفتگو (روی پیام مشتری Reply کنید)" },
        { command: "info", description: "مشخصات مشتری (Reply)" },
        { command: "r", description: "پاسخ آماده (Reply روی پیام مشتری: /r کلید)" },
        { command: "help", description: "راهنما" },
      ],
    });
    console.info("[livechat] telegram webhook set");
  } catch (e) {
    console.error("[livechat] telegram setup failed:", e instanceof Error ? e.message : e);
  }
}
