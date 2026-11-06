import { createHash } from "node:crypto";
import { SITE_URL } from "@/lib/site";

/**
 * Live chat settings (apps/web .env.production):
 * - LIVECHAT_TELEGRAM_BOT_TOKEN — a bot from @BotFather, used only for the live chat.
 * - LIVECHAT_TELEGRAM_ADMIN_ID — the numeric Telegram chat id that receives visitor messages: the admin's
 *   own user id (they must have pressed Start in the bot) or a group's id (negative). Until it's set,
 *   the bot answers anyone who writes to it with their chat id.
 * Both set → the widget shows on the site. The token alone → the webhook is set up (to learn the id).
 */
export const botToken = () => process.env.LIVECHAT_TELEGRAM_BOT_TOKEN?.trim() ?? "";
export const supportChatId = () => {
  const id = process.env.LIVECHAT_TELEGRAM_ADMIN_ID?.trim() ?? "";
  return /^-?\d+$/.test(id) ? id : "";
};
export const liveChatConfigured = () => Boolean(botToken() && supportChatId());

export const SITE_ORIGIN = new URL(SITE_URL).origin;

/** Same-site POSTs only (the widget and the admin panel): the browser always sends Origin on them. */
export const sameOrigin = (req: Request) => req.headers.get("origin") === SITE_ORIGIN;

/** Secret Telegram echoes in X-Telegram-Bot-Api-Secret-Token (derived, so no extra env var). */
export function webhookSecret() {
  return createHash("sha256")
    .update(`nobatet-livechat|${botToken()}|${process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 48);
}

export const WEBHOOK_PATH = "/api/livechat/telegram";
