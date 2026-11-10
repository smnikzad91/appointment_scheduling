import { prisma } from "@/lib/prisma";
import { botToken, supportChatId, webhookSecret } from "@/lib/livechat/config";
import {
  addMessage,
  chatByCode,
  chatByTelegramMessage,
  chatInfoHtml,
  cleanText,
  closeChat,
  lastVisitorMessage,
  openChats,
  sendQuickReply,
  supportReplied,
  syncThread,
  THREAD_ACTIONS,
  threadIdOf,
  visitorOnline,
} from "@/lib/livechat/chats";
import { answerLiveChat } from "@/lib/livechat/ai";
import { listQuickReplies } from "@/lib/livechat/quickReplies";
import { answerCallback, deleteSupportMessage, downloadTelegramFile, esc, KEYBOARD_COMMANDS, react, replyIn, type TgCallback, type TgUpdate } from "@/lib/livechat/telegram";
import { CHAT_IMAGE_MAX_BYTES, ChatImageError, saveChatImage } from "@/lib/livechat/images";
import { logError } from "@/lib/errorLog";

const HELP = [
  "<b>پشتیبانی آنلاین نوبتت</b>",
  "",
  "هر گفتگو یک پیام است که با هر پیام تازه به‌روز می‌شود (🤖 = دستیار هوشمند جواب داده). زیر آن:",
  "✍️ <b>پاسخ</b>: پیام‌های بعدی شما (متن، عکس یا فایل JPG / PNG) برای همان بازدیدکننده فرستاده می‌شود؛ /cancel انصراف",
  "🤖 <b>ادامه با دستیار</b>: گفتگو به دستیار هوشمند برمی‌گردد (یا #پایان در جوابتان)",
  "🔒 <b>بستن</b>: گفتگو بسته می‌شود",
  "",
  "📋 <b>گفتگوهای باز</b>: فهرست گفتگوهای ۳ روز اخیر (🟢 = الان در سایت)",
  "⚡ <b>پاسخ‌های آماده</b>: فهرست؛ بعد از «✍️ پاسخ» بنویسید <code>/r کلید</code>",
  "بدون دکمه هم می‌شود: <code>#K7Q2 متن جواب</code>، یا Reply روی پیام گفتگو.",
  "",
  "همه گفتگوها در پنل مدیریت سایت هم هست: «گفتگوی آنلاین».",
].join("\n");

const fa = (n: number) => n.toLocaleString("fa-IR");
const ago = (d: Date) => {
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  return m < 60 ? `${fa(m)} دقیقه پیش` : m < 1440 ? `${fa(Math.round(m / 60))} ساعت پیش` : `${fa(Math.round(m / 1440))} روز پیش`;
};

// «✍️ پاسخ»: which conversation each support member is answering (live_chat_answering, so a deploy or the
// other pm2 instance doesn't lose it). Sticky for 15 minutes after their last message.
const ANSWER_MS = 15 * 60_000;
async function answeringFor(fromId: number | undefined) {
  if (fromId == null) return null;
  const a = await prisma.liveChatAnswering.findUnique({ where: { tgUserId: BigInt(fromId) } });
  if (!a) return null;
  if (Date.now() - a.at.getTime() > ANSWER_MS) {
    await prisma.liveChatAnswering.deleteMany({ where: { tgUserId: a.tgUserId } });
    if (a.promptId) void deleteSupportMessage(a.promptId);
    return null;
  }
  return a;
}
async function startAnswering(fromId: number, chatId: string, promptId: number | null) {
  const tgUserId = BigInt(fromId);
  await prisma.liveChatAnswering.upsert({ where: { tgUserId }, create: { tgUserId, chatId, promptId, at: new Date() }, update: { chatId, promptId, at: new Date() } });
}
async function stopAnswering(chatId: string) {
  const rows = await prisma.liveChatAnswering.findMany({ where: { chatId } });
  await prisma.liveChatAnswering.deleteMany({ where: { chatId } });
  for (const r of rows) if (r.promptId) void deleteSupportMessage(r.promptId);
}

/** The conversation message's buttons: ✍️ پاسخ / 🤖 ادامه با دستیار / 🔒 بستن. */
async function handleButton(cq: TgCallback) {
  const support = supportChatId();
  if (!cq.message || String(cq.message.chat.id) !== support) return answerCallback(cq.id, "");
  const m = /^lc:([a-z]):([a-z0-9]{10,40})$/.exec(cq.data ?? "");
  if (!m) return answerCallback(cq.id, "");
  const chat = await prisma.liveChat.findUnique({ where: { id: m[2] } });
  if (!chat) return answerCallback(cq.id, "این گفتگو دیگر وجود ندارد.", true);
  if (m[1] === THREAD_ACTIONS.reply) {
    if (chat.endedByVisitor) return answerCallback(cq.id, `#${chat.code} گفتگو را بسته؛ پیام به او نمی‌رسد.${chat.contact ? ` تماس: ${chat.contact}` : ""}`, true);
    const prev = await prisma.liveChatAnswering.findUnique({ where: { tgUserId: BigInt(cq.from.id) }, select: { promptId: true } });
    if (prev?.promptId) void deleteSupportMessage(prev.promptId);
    const prompt = await replyIn(
      support,
      `✍️ <b>پاسخ به #${chat.code}</b>${chat.name ? ` · ${esc(chat.name)}` : ""}\nپیام بعدی‌تان (متن یا تصویر) برای همین بازدیدکننده فرستاده می‌شود. /cancel انصراف`,
      undefined,
      false,
    ).catch(() => null);
    await startAnswering(cq.from.id, chat.id, prompt);
    return answerCallback(cq.id, `پیامتان را برای #${chat.code} بنویسید`);
  }
  if (m[1] === THREAD_ACTIONS.ai) {
    if (chat.closedAt) return answerCallback(cq.id, `#${chat.code} بسته است.`);
    await prisma.liveChat.update({ where: { id: chat.id }, data: { mode: "AI", handoverAt: null } });
    await stopAnswering(chat.id);
    await syncThread(chat.id);
    void answerLiveChat(chat.id); // the visitor's unanswered last message gets the AI's answer now
    return answerCallback(cq.id, `🤖 #${chat.code} به دستیار هوشمند برگشت`);
  }
  if (m[1] === THREAD_ACTIONS.close) {
    const closed = await closeChat(chat);
    await stopAnswering(chat.id);
    await syncThread(chat.id);
    return answerCallback(cq.id, closed ? `🔒 #${chat.code} بسته شد` : `#${chat.code} از قبل بسته بود`);
  }
  return answerCallback(cq.id, "");
}

/** Telegram webhook of the live-chat bot: support replies and button presses → the visitor's chat widget. Always 200. */
export async function POST(req: Request) {
  if (!botToken() || req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) return new Response(null, { status: 401 });
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  try {
    if (update?.callback_query) await handleButton(update.callback_query);
    else if (update?.message && !update.message.from?.is_bot) await handle(update.message);
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
  if (cmd === "/cancel") {
    const a = await answeringFor(msg.from?.id);
    if (a?.promptId) void deleteSupportMessage(a.promptId);
    if (msg.from) await prisma.liveChatAnswering.deleteMany({ where: { tgUserId: BigInt(msg.from.id) } });
    void deleteSupportMessage(msg.message_id);
    return;
  }
  if (cmd === "/chats") {
    const list = await openChats();
    if (!list.length) return replyIn(here, "گفتگوی بازی در ۳ روز اخیر نیست.");
    const lines = await Promise.all(
      list.map(async (c) => {
        const last = await lastVisitorMessage(c.id);
        const preview = last ? esc(last.text.replace(/\s+/g, " ").slice(0, 60)) || (last.image ? "📷 تصویر" : "—") : "—";
        const mode = c.mode === "PENDING" ? "🙋" : c.mode === "AI" ? "🤖" : "🧑‍💼";
        return `${visitorOnline(c) ? "🟢" : "⚪️"} ${mode} <b>#${c.code}</b>${c.name ? ` · ${esc(c.name)}` : ""} · ${ago(c.lastMessageAt)}\n   ${preview}`;
      }),
    );
    return replyIn(here, `<b>گفتگوهای باز</b> (🟢 = الان در سایت · 🤖 دستیار · 🙋 منتظر شما · 🧑‍💼 با پشتیبان)\n\n${lines.join("\n")}\n\nبرای جواب، زیر پیام همان گفتگو «✍️ پاسخ» را بزنید.`);
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

  // After «✍️ پاسخ»: messages without a reply / #code go to the conversation being answered.
  const ans = !chat && (!cmd || cmd === "/r" || cmd === "/close" || cmd === "/info") ? await answeringFor(msg.from?.id) : null;
  if (ans) chat = await prisma.liveChat.findUnique({ where: { id: ans.chatId } });

  if (cmd === "/r") {
    const key = raw.split(/\s+/)[1]?.toLowerCase();
    const all = await listQuickReplies();
    if (!key) {
      if (!all.length) return replyIn(here, "پاسخ آماده‌ای تعریف نشده؛ در پنل مدیریت «گفتگوی آنلاین» اضافه کنید.");
      const lines = all.map((q) => `<code>/r ${esc(q.key)}</code> — ${esc(q.title)}${q.autoReply ? " ⚡" : ""}`);
      return replyIn(here, `<b>پاسخ‌های آماده</b> (⚡ = خودکار هم فرستاده می‌شود)\n\n${lines.join("\n")}\n\nبرای فرستادن، زیر گفتگو «✍️ پاسخ» را بزنید و کلید را بنویسید.`, msg.message_id);
    }
    const quick = all.find((q) => q.key === key);
    if (!quick) return replyIn(here, `پاسخ آماده «${esc(key)}» پیدا نشد. /r فهرست را نشان می‌دهد.`, msg.message_id);
    if (!chat) return replyIn(here, "اول زیر پیام گفتگو «✍️ پاسخ» را بزنید، بعد <code>/r کلید</code> را بنویسید.", msg.message_id);
    if (chat.endedByVisitor) return replyIn(here, `⛔️ #${chat.code} گفتگو را بسته؛ این پیام به او نمی‌رسد.`, msg.message_id);
    const author = cleanText(msg.from?.first_name ?? "", 60).replace(/\n/g, " ") || null;
    const thread = await threadIdOf(chat.id);
    await sendQuickReply(chat, quick.text, thread, author);
    if (await deleteSupportMessage(msg.message_id)) return; // it's in the conversation message now
    react(here, msg.message_id, visitorOnline(chat) ? "👍" : "👀");
    return;
  }

  if (cmd === "/close" || cmd === "/info") {
    if (!chat) return replyIn(here, "از دکمه‌های زیر پیام گفتگو استفاده کنید (✍️ پاسخ / 🔒 بستن)، یا روی پیام گفتگو Reply کنید.", msg.message_id);
    if (cmd === "/info") return replyIn(here, `<b>#${chat.code}</b>${chat.closedAt ? " (بسته)" : ""}\n${await chatInfoHtml(chat)}`, msg.message_id);
    const closed = await closeChat(chat);
    await stopAnswering(chat.id);
    return replyIn(here, closed ? `گفتگوی #${chat.code} بسته شد.` : `گفتگوی #${chat.code} از قبل بسته بود.`, msg.message_id);
  }
  if (cmd) return replyIn(here, HELP);

  if (!chat) return replyIn(here, "برای جواب دادن، زیر پیام همان گفتگو «✍️ پاسخ» را بزنید، بعد پیامتان را بنویسید. /chats فهرست گفتگوهای باز را نشان می‌دهد.", msg.message_id);
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
  const reply = await supportReplied(chat.id, body);
  if (!reply && !image) {
    // Just «#پایان»: the conversation message now says «🤖 دستیار»; the supporter's message goes.
    const synced = await syncThread(chat.id);
    void answerLiveChat(chat.id); // a waiting visitor message is answered right away
    if (ans) await stopAnswering(chat.id);
    if (synced && (await deleteSupportMessage(msg.message_id))) return;
    react(here, msg.message_id, "👌");
    return replyIn(here, `🤖 #${chat.code} به دستیار هوشمند برگشت؛ پیام بعدی بازدیدکننده را دستیار جواب می‌دهد.`, msg.message_id);
  }
  const saved = await addMessage(chat.id, "ADMIN", reply, { tgMessageId: msg.message_id, author, image });
  const synced = await syncThread(chat.id); // the conversation message shows the reply too
  if (ans) {
    // Still answering this visitor (sticky); the «✍️ پاسخ به …» prompt has done its job.
    if (ans.promptId) void deleteSupportMessage(ans.promptId);
    await prisma.liveChatAnswering.update({ where: { tgUserId: ans.tgUserId }, data: { promptId: null, at: new Date() } }).catch(() => {});
  }
  // Text replies are deleted once they're in the conversation message (one message per chat); photos stay.
  // If Telegram refuses (a group where the bot isn't admin), the old 👍 / 👀 feedback below.
  if (synced && !image && (await deleteSupportMessage(msg.message_id))) {
    const thread = await threadIdOf(chat.id);
    if (thread) await prisma.liveChatMessage.update({ where: { id: saved.id }, data: { tgMessageId: thread } });
    return;
  }
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
