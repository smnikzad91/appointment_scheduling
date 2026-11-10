import { prisma } from "@/lib/prisma";
import { botToken, supportChatId, webhookSecret } from "@/lib/livechat/config";
import { addMessage, chatByCode, chatByTelegramMessage, chatInfoHtml, cleanText, closeChat, lastVisitorMessage, openChats, sendQuickReply, visitorOnline } from "@/lib/livechat/chats";
import { listQuickReplies } from "@/lib/livechat/quickReplies";
import { downloadTelegramFile, esc, KEYBOARD_COMMANDS, react, replyIn, type TgUpdate } from "@/lib/livechat/telegram";
import { CHAT_IMAGE_MAX_BYTES, ChatImageError, saveChatImage } from "@/lib/livechat/images";
import { logError } from "@/lib/errorLog";

const HELP = [
  "<b>پشتیبانی آنلاین نوبتت</b>",
  "",
  "↩️ برای جواب دادن، روی پیام مشتری <b>Reply</b> کنید و بنویسید (متن، عکس، یا فایل JPG / PNG).",
  "یا بدون Reply: <code>#K7Q2 متن جواب</code>",
  "",
  "📋 <b>گفتگوهای باز</b>: فهرست گفتگوهای ۳ روز اخیر (🟢 = الان در سایت)",
  "⚡ <b>پاسخ‌های آماده</b>: فهرست؛ برای فرستادن، روی پیام مشتری Reply کنید و بنویسید <code>/r کلید</code>",
  "🔒 <b>بستن گفتگو</b> و ℹ️ <b>مشخصات مشتری</b>: اول روی پیام مشتری Reply را بزنید، بعد دکمه را.",
  "",
  "همه گفتگوها در پنل مدیریت سایت هم هست: «گفتگوی آنلاین».",
].join("\n");

const fa = (n: number) => n.toLocaleString("fa-IR");
const ago = (d: Date) => {
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  return m < 60 ? `${fa(m)} دقیقه پیش` : m < 1440 ? `${fa(Math.round(m / 60))} ساعت پیش` : `${fa(Math.round(m / 1440))} روز پیش`;
};

/** Telegram webhook of the live-chat bot: support replies → the visitor's chat widget. Always 200. */
export async function POST(req: Request) {
  if (!botToken() || req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) return new Response(null, { status: 401 });
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  const msg = update?.message;
  if (!msg || msg.from?.is_bot) return new Response(null);
  try {
    await handle(msg);
  } catch (error) {
    await logError({ error, path: "/api/livechat/telegram" });
  }
  return new Response(null);
}

async function handle(msg: NonNullable<TgUpdate["message"]>) {
  const support = supportChatId();
  const here = msg.chat.id;
  if (!support || String(here) !== support) {
    // Setup help: before LIVECHAT_TELEGRAM_ADMIN_ID is set, tell whoever writes their chat id.
    if (!support) await replyIn(here, `شناسه این چت: <code>${here}</code>\nاین عدد را در LIVECHAT_TELEGRAM_ADMIN_ID بگذارید تا پیام‌های سایت اینجا بیاید.`, undefined, false);
    return;
  }

  const typed = (msg.text ?? msg.caption ?? "").trim();
  const raw = KEYBOARD_COMMANDS[typed] ?? typed; // fixed keyboard buttons = commands
  const cmd = msg.text && raw.startsWith("/") ? raw.split(/\s/)[0].split("@")[0].toLowerCase() : null;
  // A photo, or a JPEG / PNG sent as a file ("without compression"; screenshots are often PNG)
  const doc = msg.document;
  const imageDoc = doc && (/^image\/(jpeg|png)$/.test(doc.mime_type ?? "") || /\.(jpe?g|png)$/i.test(doc.file_name ?? "")) ? doc.file_id : null;
  const photoId = msg.photo?.at(-1)?.file_id ?? imageDoc;
  const target = msg.reply_to_message ? await chatByTelegramMessage(msg.reply_to_message.message_id) : null;

  if (cmd === "/start" || cmd === "/help") return replyIn(here, HELP);
  if (cmd === "/chats") {
    const list = await openChats();
    if (!list.length) return replyIn(here, "گفتگوی بازی در ۳ روز اخیر نیست.");
    const lines = await Promise.all(
      list.map(async (c) => {
        const last = await lastVisitorMessage(c.id);
        const preview = last ? esc(last.text.replace(/\s+/g, " ").slice(0, 60)) || (last.image ? "📷 تصویر" : "—") : "—";
        return `${visitorOnline(c) ? "🟢" : "⚪️"} <b>#${c.code}</b>${c.name ? ` · ${esc(c.name)}` : ""} · ${ago(c.lastMessageAt)}\n   ${preview}`;
      }),
    );
    return replyIn(here, `<b>گفتگوهای باز</b> (🟢 = الان در سایت)\n\n${lines.join("\n")}\n\nجواب: <code>#کد متن</code>`);
  }

  // "#K7Q2 text" without a reply
  let chat = target;
  let text = raw;
  const tagged = !chat && /^#([A-Za-z0-9]{4,6})(?:\s+([\s\S]*))?$/.exec(raw);
  if (tagged) {
    chat = await chatByCode(tagged[1]);
    text = tagged[2] ?? "";
    if (!chat) return replyIn(here, `گفتگوی #${esc(tagged[1].toUpperCase())} پیدا نشد.`, msg.message_id);
  }

  if (cmd === "/r") {
    const key = raw.split(/\s+/)[1]?.toLowerCase();
    const all = await listQuickReplies();
    if (!key) {
      if (!all.length) return replyIn(here, "پاسخ آماده‌ای تعریف نشده؛ در پنل مدیریت «گفتگوی آنلاین» اضافه کنید.");
      const lines = all.map((q) => `<code>/r ${esc(q.key)}</code> — ${esc(q.title)}${q.autoReply ? " 🤖" : ""}`);
      return replyIn(here, `<b>پاسخ‌های آماده</b> (🤖 = خودکار هم فرستاده می‌شود)\n\n${lines.join("\n")}\n\nبرای فرستادن، روی پیام مشتری Reply کنید و کلید را بنویسید.`, msg.message_id);
    }
    const quick = all.find((q) => q.key === key);
    if (!quick) return replyIn(here, `پاسخ آماده «${esc(key)}» پیدا نشد. /r فهرست را نشان می‌دهد.`, msg.message_id);
    if (!target) return replyIn(here, "اول روی پیام مشتری Reply کنید، بعد <code>/r کلید</code> را بنویسید.", msg.message_id);
    if (target.endedByVisitor) return replyIn(here, `⛔️ #${target.code} گفتگو را بسته؛ این پیام به او نمی‌رسد.`, msg.message_id);
    const author = cleanText(msg.from?.first_name ?? "", 60).replace(/\n/g, " ") || null;
    await sendQuickReply(target, quick.text, msg.message_id, author);
    react(here, msg.message_id, visitorOnline(target) ? "👍" : "👀");
    return replyIn(here, `✓ «${esc(quick.title)}» برای #${target.code} فرستاده شد.`, msg.message_id, false);
  }

  if (cmd === "/close" || cmd === "/info") {
    if (!chat) return replyIn(here, "اول روی یکی از پیام‌های مشتری Reply را بزنید، بعد این دکمه را.", msg.message_id);
    if (cmd === "/info") return replyIn(here, `<b>#${chat.code}</b>${chat.closedAt ? " (بسته)" : ""}\n${await chatInfoHtml(chat)}`, msg.message_id);
    const closed = await closeChat(chat);
    return replyIn(here, closed ? `گفتگوی #${chat.code} بسته شد.` : `گفتگوی #${chat.code} از قبل بسته بود.`, msg.message_id);
  }
  if (cmd) return replyIn(here, HELP);

  if (!chat) return replyIn(here, "برای جواب دادن روی پیام مشتری Reply کنید، یا بنویسید <code>#کد متن</code>. /chats فهرست گفتگوهای باز را نشان می‌دهد.", msg.message_id);
  if (!msg.text && !photoId) return replyIn(here, "فقط متن و تصویر به مشتری فرستاده می‌شود (عکس، یا فایل JPG / PNG).", msg.message_id);
  const body = cleanText(text, 2000);
  if (!body && !photoId) return;

  if (chat.endedByVisitor)
    return replyIn(here, `⛔️ #${chat.code} گفتگو را بسته؛ این پیام به او نمی‌رسد.${chat.contact ? `\nتماس: <code>${esc(chat.contact)}</code>` : ""}`, msg.message_id);
  if (chat.closedAt) await prisma.liveChat.update({ where: { id: chat.id }, data: { closedAt: null } }); // answering reopens it
  let image = null;
  if (photoId) {
    try {
      image = (await saveChatImage(chat.id, await downloadTelegramFile(photoId, CHAT_IMAGE_MAX_BYTES), { allowPng: true })).image;
    } catch (e) {
      return replyIn(here, `عکس فرستاده نشد: ${esc(e instanceof ChatImageError ? e.message : "دریافت فایل از تلگرام ناموفق بود")}`, msg.message_id);
    }
  }
  const author = cleanText(msg.from?.first_name ?? "", 60).replace(/\n/g, " ") || null;
  await addMessage(chat.id, "ADMIN", body, { tgMessageId: msg.message_id, author, image });
  if (visitorOnline(chat)) react(here, msg.message_id, "👍");
  else {
    react(here, msg.message_id, "👀");
    await replyIn(
      here,
      `⏳ #${chat.code} الان در سایت نیست؛ جواب ذخیره شد و دفعه بعد که سایت را باز کند می‌بیند.${chat.contact ? `\nتماس: <code>${esc(chat.contact)}</code>` : ""}`,
      msg.message_id,
    );
  }
}
