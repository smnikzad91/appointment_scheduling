import { createHash, randomBytes, randomInt } from "node:crypto";
import { Prisma, type LiveChat, type LiveChatMessage, type LiveChatSender } from "@appointment-scheduling/database";
import { prisma } from "@/lib/prisma";
import { clearSupportButtons, deleteSupportMessage, editSupportMessage, esc, sendPhotoToSupport, sendToSupport, type InlineKeyboard } from "./telegram";
import { imageOf, removeChatFiles, type ChatImage } from "./images";
import { CHAT_IMAGE_DELETED, MESSAGE_MAX, ONLINE_MS, type ChatMessageOut } from "./rules";
import { isReaction, type ImageReactions, type Reaction } from "./reactions";
import { matchAutoReply } from "./quickReplies";

/**
 * Site live chat («گفتگو با پشتیبان»). The AI assistant answers first (lib/livechat/ai.ts); every
 * conversation is ONE message in the support Telegram chat (LIVECHAT_TELEGRAM_ADMIN_ID), edited in place
 * as lines arrive, with «✍️ پاسخ» / «🤖 ادامه با دستیار» / «🔒 بستن» buttons under it. Support also answers
 * from /admin/live-chat. The widget polls /api/livechat/poll for replies.
 */

export const CHAT_COOKIE = "nobatet_chat";
export const CHAT_COOKIE_DAYS = 30;
const HISTORY = 100;
const RETENTION_DAYS = 180;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const SENDER_OUT: Record<LiveChatSender, ChatMessageOut["sender"]> = { VISITOR: "visitor", ADMIN: "admin", SYSTEM: "system", AI: "ai" };

const reactionsOf = (m: { visitorReaction: string | null; supportReaction: string | null }): ImageReactions => ({
  visitor: isReaction(m.visitorReaction) ? m.visitorReaction : null,
  support: isReaction(m.supportReaction) ? m.supportReaction : null,
});

// `author` (who answered) stays server-side; visitors just see «پشتیبانی».
export const outMessage = (m: LiveChatMessage): ChatMessageOut => {
  const image = imageOf(m.image);
  return {
    id: m.id,
    sender: SENDER_OUT[m.sender],
    text: m.text,
    at: m.createdAt.toISOString(),
    image: image ? { w: image.w, h: image.h } : null, // the file itself: /api/livechat/file/<id>
    ...(image ? { reactions: reactionsOf(m) } : {}),
    ...(m.editedAt ? { edited: true } : {}),
    ...(m.replyToId ? { replyTo: m.replyToId } : {}),
  };
};

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = (n = 4) => Array.from({ length: n }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

/** Removes control and direction-override characters (keeps newlines) and trims. */
export function cleanText(s: unknown, max = MESSAGE_MAX) {
  return String(s ?? "")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F‪-‮⁦-⁩]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export async function chatByToken(token: string | null | undefined) {
  if (!token || token.length > 100) return null;
  return prisma.liveChat.findUnique({ where: { tokenHash: sha256(token) } });
}

export async function chatHistory(chatId: string) {
  const rows = await prisma.liveChatMessage.findMany({ where: { chatId }, orderBy: { createdAt: "desc" }, take: HISTORY });
  return rows.reverse().map(outMessage);
}

/** Messages new or changed (reaction, caption edit…) since `since` — the widget's previous poll — oldest first; it merges them by id. */
export async function messagesSince(chatId: string, since: Date) {
  const rows = await prisma.liveChatMessage.findMany({ where: { chatId, updatedAt: { gte: since } }, orderBy: { createdAt: "asc" }, take: HISTORY });
  return rows.map(outMessage);
}

/** Support opened the conversation in the panel: the visitor's messages show ✓✓. */
export async function markSupportRead(chatId: string) {
  await prisma.liveChat.updateMany({ where: { id: chatId }, data: { supportReadAt: new Date() } });
}

/** The visitor had the chat open with support's replies on screen (admin transcript: «خوانده شد»). */
export async function markVisitorRead(chatId: string) {
  await prisma.liveChat.updateMany({ where: { id: chatId }, data: { visitorReadAt: new Date() } });
}

/** «… در حال نوشتن» on the visitor's widget (an admin typing in the panel, or the AI working). */
export async function notifyTyping(chatId: string) {
  await prisma.liveChat.updateMany({ where: { id: chatId, endedByVisitor: false }, data: { supportTypingAt: new Date() } });
}

/**
 * Sets (or with null, removes) one side's reaction to an image in an open conversation — one per side;
 * double-tap in the viewer = ❤️. Returns both sides' reactions, or null when there's no such image.
 */
export async function setImageReaction(chatId: string, messageId: string, side: "visitor" | "support", reaction: Reaction | null): Promise<ImageReactions | null> {
  const where = { id: messageId, chatId, image: { not: Prisma.DbNull } };
  const n = await prisma.liveChatMessage.updateMany({ where, data: side === "visitor" ? { visitorReaction: reaction } : { supportReaction: reaction } });
  if (!n.count) return null;
  const row = await prisma.liveChatMessage.findUnique({ where: { id: messageId }, select: { visitorReaction: true, supportReaction: true } });
  return row ? reactionsOf(row) : null;
}

/**
 * Changes the caption of an image the given side sent, in an open conversation. Both sides see it
 * («ویرایش‌شده»), and the conversation's Telegram message shows the new caption. Returns the saved
 * caption, or null when there's no such image of theirs.
 */
export async function editImageCaption(chat: LiveChat, messageId: string, sender: "VISITOR" | "ADMIN", caption: string, _author?: string) {
  void _author; // the conversation message shows who sent the image already
  const n = await prisma.liveChatMessage.updateMany({
    where: { id: messageId, chatId: chat.id, sender, image: { not: Prisma.DbNull } },
    data: { text: caption, editedAt: new Date() },
  });
  if (!n.count) return null;
  const row = await prisma.liveChatMessage.findUniqueOrThrow({ where: { id: messageId }, select: { text: true } });
  void syncThread(chat.id);
  return row.text;
}

/** The image a comment replies to: must be an image message of this conversation. tg = its Telegram copy (for threading). */
export async function imageInChat(chatId: string, messageId: unknown) {
  if (typeof messageId !== "string" || !/^[a-z0-9]{10,40}$/.test(messageId)) return null;
  const m = await prisma.liveChatMessage.findFirst({ where: { id: messageId, chatId, image: { not: Prisma.DbNull } }, select: { id: true, tgMessageId: true } });
  return m ? { id: m.id, tg: m.tgMessageId } : null;
}
export type ImageRef = NonNullable<Awaited<ReturnType<typeof imageInChat>>>;

export async function addMessage(
  chatId: string,
  sender: LiveChatSender,
  text: string,
  opts: { tgMessageId?: number | null; author?: string | null; image?: ChatImage | null; replyToId?: string | null; auto?: boolean } = {},
) {
  const row = await prisma.liveChatMessage.create({
    data: { chatId, sender, text, tgMessageId: opts.tgMessageId ?? null, author: opts.author ?? null, image: opts.image ?? undefined, replyToId: opts.replyToId ?? null },
  });
  // A support reply means support has read everything before it (and has stopped typing) — not an automatic one.
  await prisma.liveChat.update({
    where: { id: chatId },
    data: sender === "ADMIN" && !opts.auto ? { lastMessageAt: row.createdAt, supportReadAt: row.createdAt, supportTypingAt: null } : { lastMessageAt: row.createdAt },
  });
  // Answered (support / AI / automatic) or closed: the «🔔» alert for this chat has done its job.
  if (sender !== "VISITOR") void clearPing(chatId);
  return row;
}

const END_TAG = /#\s*(?:(?:پایان|پايان)(?![؀-ۿ])|end\b)/i;
const END_TAG_ALL = /#\s*(?:(?:پایان|پايان)(?![؀-ۿ])|end\b)/gi;

/**
 * Support answered (Telegram or panel): the chat stays with a person (AI off). #پایان / #end in the reply
 * hands it back to the AI; the tag is removed from what the visitor sees. Returns the text to store.
 */
export async function supportReplied(chatId: string, text: string) {
  const back = END_TAG.test(text);
  await prisma.liveChat.update({ where: { id: chatId }, data: back ? { mode: "AI", handoverAt: null } : { mode: "HUMAN" } });
  return back ? text.replace(END_TAG_ALL, "").trim() : text;
}

/** New conversation; returns the cookie token (only its hash is stored). */
export async function createChat(input: { name?: string | null; contact?: string | null; userId?: string | null; page?: string | null; country?: string | null; city?: string | null }) {
  const token = randomBytes(24).toString("base64url");
  for (let attempt = 0; ; attempt++) {
    try {
      const chat = await prisma.liveChat.create({
        data: {
          tokenHash: sha256(token),
          code: newCode(attempt < 5 ? 4 : 6),
          name: input.name || null,
          contact: input.contact || null,
          userId: input.userId ?? null,
          page: input.page?.slice(0, 300) || null,
          country: input.country?.slice(0, 8) || null,
          city: input.city?.slice(0, 80) || null,
        },
      });
      return { chat, token };
    } catch (e) {
      if (attempt >= 8) throw e; // code collision → retry with a new code
    }
  }
}

const label = (chat: LiveChat) => `<b>#${chat.code}</b>${chat.name ? ` · ${esc(chat.name)}` : ""}`;

const ROLE_FA: Record<string, string> = { CUSTOMER: "مشتری", SALON_OWNER: "مالک سالن", INDEPENDENT_STYLIST: "آرایشگر مستقل", STYLIST: "آرایشگر سالن", PLATFORM_ADMIN: "مدیر" };

/** The details block Telegram shows for a conversation (thread header + /info). */
export async function chatInfoHtml(chat: LiveChat) {
  const lines = [`👤 ${chat.name ? esc(chat.name) : "بدون نام"}${chat.contact ? ` · 📱 <code>${esc(chat.contact)}</code>` : ""}`];
  if (chat.userId) {
    const u = await prisma.user.findUnique({ where: { id: chat.userId }, select: { firstName: true, lastName: true, phone: true, role: true } });
    if (u) lines.push(`🔑 حساب ${ROLE_FA[u.role] ?? u.role}: ${esc([u.firstName, u.lastName].filter(Boolean).join(" ") || "—")}${u.phone ? ` · <code>${esc(u.phone)}</code>` : ""}`);
  }
  const where = [chat.city, chat.country].filter(Boolean).join("، ");
  lines.push(`📍 ${where ? esc(where) : "نامشخص"}${chat.page ? ` · صفحه ${esc(chat.page)}` : ""}`);
  return lines.join("\n");
}

// ---------- One Telegram message per conversation ----------

const THREAD_MAX = 3900; // Telegram's limit is 4096 characters after HTML parsing; keep headroom
const TIME = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });

function lineFor(m: LiveChatMessage, chat: LiveChat) {
  const t = TIME.format(m.createdAt);
  const img = imageOf(m.image);
  const deleted = !img && m.text.startsWith(CHAT_IMAGE_DELETED);
  const body = `${img ? "📷 <i>تصویر</i>" + (m.text ? " " : "") : ""}${esc(m.text)}${m.editedAt ? " <i>(ویرایش‌شده)</i>" : ""}`;
  if (m.sender === "SYSTEM") return `<i>ℹ️ ${t} ${esc(m.text)}</i>`;
  const who =
    m.sender === "VISITOR" ? `👤 ${esc(chat.name || "بازدیدکننده")}` : m.sender === "AI" ? "🤖 دستیار" : m.author === "پاسخ خودکار" ? "⚡ پاسخ خودکار" : `🧑‍💼 ${esc(m.author || "پشتیبان")}`;
  return `<b>${who}</b> <code>${t}</code>\n${deleted ? `<i>${esc(m.text)}</i>` : body}`;
}

async function threadHtml(chat: LiveChat, rows: LiveChatMessage[], continued: boolean) {
  const state =
    (chat.endedByVisitor ? " · 🔴 بازدیدکننده بست" : chat.closedAt ? " · 🔒 بسته" : chat.mode === "PENDING" ? " · 🙋 منتظر پشتیبان انسانی" : chat.mode === "HUMAN" ? " · 🧑‍💼 با پشتیبان" : " · 🤖 دستیار") +
    // Replies are deleted from the chat once they're in here, so where the visitor is shows in the header.
    (!chat.closedAt && !chat.endedByVisitor ? (visitorOnline(chat) ? " · 🟢 در سایت" : " · ⏳ در سایت نیست؛ جواب را دفعه بعد می‌بیند") : "") +
    (chat.rating ? ` · ${chat.rating > 0 ? "👍 راضی بود" : "👎 راضی نبود"}` : "");
  const head = continued ? `💬 ادامه گفتگوی ${label(chat)}${state}` : `💬 گفتگوی ${label(chat)}${state}\n${await chatInfoHtml(chat)}`;
  const foot = chat.endedByVisitor ? "" : "\n\n<i>برای جواب «✍️ پاسخ» را بزنید و پیامتان را بنویسید.</i>";
  return `${head}\n\n${rows.map((m) => lineFor(m, chat)).join("\n\n")}${foot}`;
}

/** Callback data of the conversation message's buttons: lc:<r|a|c>:<chat id>. */
export const THREAD_ACTIONS = { reply: "r", ai: "a", close: "c" } as const;

/** «✍️ پاسخ» / «🤖 ادامه با دستیار» / «🔒 بستن», as far as they make sense for the chat's state. */
function threadKeyboard(chat: LiveChat): InlineKeyboard | null {
  if (chat.endedByVisitor) return null;
  const b = (text: string, a: string) => ({ text, callback_data: `lc:${a}:${chat.id}` });
  const row = [b("✍️ پاسخ", THREAD_ACTIONS.reply)];
  if (!chat.closedAt && chat.mode !== "AI") row.push(b("🤖 ادامه با دستیار", THREAD_ACTIONS.ai));
  if (!chat.closedAt) row.push(b("🔒 بستن", THREAD_ACTIONS.close));
  return { inline_keyboard: [row] };
}

/**
 * Renders the conversation into its one Telegram message: the first render sends it (a notification for
 * a new chat), later ones edit it in place. Near the length limit a «ادامه» message starts from the
 * newest line. Lines without a Telegram message get the thread's id, so replies to it route here.
 * Runs under a per-chat advisory lock (two pm2 instances). false = Telegram unreachable (retried later).
 */
async function pushThread(chatId: string) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"livechat:" + chatId}))`;
      const chat = await tx.liveChat.findUnique({ where: { id: chatId } });
      if (!chat) return false;
      let rows = await tx.liveChatMessage.findMany({
        where: { chatId, ...(chat.tgThreadFrom ? { createdAt: { gte: chat.tgThreadFrom } } : {}) },
        orderBy: { createdAt: "asc" },
      });
      if (!rows.length) return true;
      let threadId = chat.tgThreadId;
      let html = await threadHtml(chat, rows, Boolean(chat.tgThreadFrom));
      try {
        if (threadId && html.length > THREAD_MAX) {
          // Too long: continue in a new message from the newest line.
          rows = rows.slice(-1);
          html = await threadHtml(chat, rows, true);
          const old = threadId;
          const id = await sendToSupport(html, threadId, threadKeyboard(chat));
          await tx.liveChat.update({ where: { id: chatId }, data: { tgThreadId: id, tgThreadFrom: rows[0].createdAt } });
          threadId = id;
          await clearSupportButtons(old); // buttons only on the newest part
        } else if (threadId) {
          try {
            await editSupportMessage(threadId, html, threadKeyboard(chat));
          } catch (e) {
            if (!(e instanceof Error && /message to edit not found|message can't be edited/i.test(e.message))) throw e;
            const id = await sendToSupport(html, null, threadKeyboard(chat)); // deleted in Telegram: start again
            await tx.liveChat.update({ where: { id: chatId }, data: { tgThreadId: id } });
            threadId = id;
          }
        } else {
          const tooLong = html.length > THREAD_MAX;
          if (tooLong) html = await threadHtml(chat, (rows = rows.slice(-1)), true);
          const id = await sendToSupport(html, null, threadKeyboard(chat));
          await tx.liveChat.update({ where: { id: chatId }, data: { tgThreadId: id, tgThreadFrom: tooLong ? rows[0].createdAt : null } });
          threadId = id;
        }
      } catch (e) {
        console.error("[livechat] thread update failed:", e instanceof Error ? e.message : e);
        return false;
      }
      const missing = rows.filter((r) => r.tgMessageId == null).map((r) => r.id);
      if (missing.length) await tx.liveChatMessage.updateMany({ where: { id: { in: missing } }, data: { tgMessageId: threadId } });
      return true;
    },
    { maxWait: 20_000, timeout: 60_000 },
  );
}

// One update at a time per conversation in this process; lines arriving meanwhile are folded into one more edit.
const g = globalThis as unknown as { __nobatetThreads?: Map<string, { again: boolean; run: Promise<boolean> }> };
const threads: Map<string, { again: boolean; run: Promise<boolean> }> = (g.__nobatetThreads ??= new Map());

export function syncThread(chatId: string): Promise<boolean> {
  const cur = threads.get(chatId);
  if (cur) {
    cur.again = true;
    return cur.run;
  }
  const st = { again: false, run: Promise.resolve(true) };
  st.run = (async () => {
    let ok = true;
    try {
      do {
        st.again = false;
        ok = await pushThread(chatId).catch((e) => {
          console.error("[livechat] thread sync failed:", e instanceof Error ? e.message : e);
          return false;
        });
      } while (st.again);
    } finally {
      threads.delete(chatId);
    }
    return ok;
  })();
  threads.set(chatId, st);
  return st.run;
}

/** The conversation's Telegram message (photos are threaded under it). */
export async function threadIdOf(chatId: string) {
  const c = await prisma.liveChat.findUnique({ where: { id: chatId }, select: { tgThreadId: true } });
  return c?.tgThreadId ?? null;
}

/** Removes the chat's «🔔 new message» alert from the support chat (once answered / closed). */
async function clearPing(chatId: string) {
  const row = await prisma.liveChat.findUnique({ where: { id: chatId }, select: { tgPingId: true } });
  if (!row?.tgPingId) return;
  // Clear only that alert (a newer one may have replaced it meanwhile), then delete it in Telegram.
  const n = await prisma.liveChat.updateMany({ where: { id: chatId, tgPingId: row.tgPingId }, data: { tgPingId: null } });
  if (n.count) await deleteSupportMessage(row.tgPingId);
}

/**
 * Edits don't notify in Telegram: a new visitor line in an existing conversation also gets a short «🔔»
 * alert under the conversation message (the chat's previous alert is replaced, so at most one waits).
 */
async function pingNewMessage(chat: LiveChat, text: string) {
  const c = await prisma.liveChat.findUnique({ where: { id: chat.id }, select: { tgThreadId: true, tgPingId: true } });
  if (!c?.tgThreadId) return;
  const preview = text.replace(/\s+/g, " ").trim().slice(0, 90) || "📷 تصویر";
  try {
    const id = await sendToSupport(`🔔 <b>#${chat.code}</b>${chat.name ? ` · ${esc(chat.name)}` : ""}: ${esc(preview)}`, c.tgThreadId);
    await prisma.liveChat.update({ where: { id: chat.id }, data: { tgPingId: id } });
    if (c.tgPingId) void deleteSupportMessage(c.tgPingId);
  } catch (e) {
    console.warn("[livechat] new-message alert failed:", e instanceof Error ? e.message : e);
  }
}

const AI_GRACE_MS = 15_000;

/** AI mode: alert only when this visitor message is still the latest one (nobody answered it within 15 s). */
async function pingIfUnanswered(chat: LiveChat, messageId: string, text: string) {
  try {
    const latest = await prisma.liveChatMessage.findFirst({ where: { chatId: chat.id }, orderBy: { createdAt: "desc" }, select: { id: true } });
    if (latest?.id === messageId) await pingNewMessage(chat, text);
  } catch (e) {
    console.warn("[livechat] delayed alert failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * Saves a visitor message (text, or an image with an optional caption) and puts it in the conversation's
 * Telegram message. `about` = the image this message comments on (from imageInChat). A keyword quick
 * reply marked «خودکار» may answer it right away; otherwise the caller lets the AI answer (answerLiveChat).
 */
export async function visitorSend(chat: LiveChat, text: string, img?: { image: ChatImage; jpeg: Buffer }, about?: ImageRef | null) {
  const now = await prisma.liveChat.findUnique({ where: { id: chat.id }, select: { tgThreadId: true, mode: true } });
  const hadThread = Boolean(now?.tgThreadId);
  const row = await addMessage(chat.id, "VISITOR", text, { image: img?.image, replyToId: about?.id });
  if (text) await autoReply(chat, text).catch((e) => console.error("[livechat] auto reply failed:", e instanceof Error ? e.message : e));
  let delivered: boolean;
  if (!img) {
    delivered = await syncThread(chat.id);
  } else {
    // Photos can't be appended to a text message: sent on their own, threaded under the conversation.
    await syncThread(chat.id);
    try {
      const tgId = await sendPhotoToSupport(img.jpeg, `📷 ${label(chat)}${text ? `\n${esc(text)}` : ""}`, about?.tg ?? (await threadIdOf(chat.id)));
      await prisma.liveChatMessage.update({ where: { id: row.id }, data: { tgMessageId: tgId } });
      delivered = true;
    } catch (e) {
      console.error("[livechat] photo forward failed:", e instanceof Error ? e.message : e);
      delivered = false;
    }
  }
  // The first message creates the conversation message (that notifies); later ones are edits → a «🔔» alert:
  // right away with a person on the chat; in AI mode only if nobody answered within 15 s (AI failed or slow).
  if (delivered && hadThread) {
    if (now?.mode === "AI") setTimeout(() => void pingIfUnanswered(chat, row.id, text), AI_GRACE_MS);
    else await pingNewMessage(chat, text);
  }
  return { row, delivered };
}

/**
 * A quick reply marked «پاسخ خودکار» whose keyword is in the visitor's message goes out by itself (each
 * at most once per chat), labelled «⚡ پاسخ خودکار» in the Telegram conversation. The AI then has nothing to answer.
 */
async function autoReply(chat: LiveChat, text: string) {
  const fresh = await prisma.liveChat.findUnique({ where: { id: chat.id }, select: { autoReplied: true, closedAt: true } });
  if (!fresh || fresh.closedAt) return;
  const reply = await matchAutoReply(text, fresh.autoReplied);
  if (!reply) return;
  await prisma.liveChat.update({ where: { id: chat.id }, data: { autoReplied: { push: reply.id } } });
  await addMessage(chat.id, "ADMIN", reply.text, { author: "پاسخ خودکار", auto: true });
}

/** «راضی بودید؟» — the visitor's 👍 (1) / 👎 (-1) at the end; shown in the conversation's Telegram header. */
export async function rateChat(chat: LiveChat, rating: 1 | -1) {
  await prisma.liveChat.update({ where: { id: chat.id }, data: { rating, ratedAt: new Date() } });
  if (chat.tgThreadId) void syncThread(chat.id);
}

/** A quick reply sent by support (Telegram «/r key»): stored like a reply from that support member. */
export async function sendQuickReply(chat: LiveChat, text: string, tgMessageId: number | null, author: string | null) {
  if (chat.closedAt) await prisma.liveChat.update({ where: { id: chat.id }, data: { closedAt: null } }); // answering reopens it
  await supportReplied(chat.id, "");
  const row = await addMessage(chat.id, "ADMIN", text, { tgMessageId, author });
  await syncThread(chat.id);
  return row;
}

/** Which conversation a Telegram reply belongs to. */
export async function chatByTelegramMessage(tgMessageId: number) {
  const viaThread = await prisma.liveChat.findFirst({ where: { OR: [{ tgThreadId: tgMessageId }, { tgPingId: tgMessageId }] } });
  if (viaThread) return viaThread;
  const m = await prisma.liveChatMessage.findFirst({ where: { tgMessageId }, orderBy: { createdAt: "desc" }, include: { chat: true } });
  return m?.chat ?? null;
}

export function chatByCode(code: string) {
  return prisma.liveChat.findUnique({ where: { code: code.toUpperCase() } });
}

/**
 * A closed conversation keeps no files: its images are deleted from disk and their messages become
 * «📷 تصویر حذف شد» (+ caption). Open widgets drop the images on their next poll (imagesPurgedAt).
 */
export async function purgeChatImages(chatId: string) {
  const n = await prisma.$executeRaw`
    UPDATE "live_chat_messages"
    SET "image" = NULL, "visitorReaction" = NULL, "supportReaction" = NULL, "updatedAt" = now(),
        "text" = CASE WHEN "text" = '' THEN ${CHAT_IMAGE_DELETED} ELSE ${CHAT_IMAGE_DELETED + "\n"} || "text" END
    WHERE "chatId" = ${chatId} AND "image" IS NOT NULL`;
  await removeChatFiles([chatId]);
  if (n > 0) await prisma.liveChat.updateMany({ where: { id: chatId }, data: { imagesPurgedAt: new Date() } });
}

/** Support closes it (Telegram «🔔 بستن» or the panel). false = it was closed already. Hands it back to the AI for next time. */
export async function closeChat(chat: LiveChat) {
  if (chat.closedAt) return false;
  await prisma.liveChat.update({ where: { id: chat.id }, data: { closedAt: new Date(), mode: "AI", handoverAt: null } });
  await purgeChatImages(chat.id);
  await addMessage(chat.id, "SYSTEM", "پشتیبانی این گفتگو را بست. اگر سؤال دیگری دارید، گفتگوی تازه‌ای شروع کنید.");
  void syncThread(chat.id);
  return true;
}

/** The visitor ends the conversation from the widget («بستن»): their token stops working; the Telegram message says so. */
export async function endChatByVisitor(chat: LiveChat) {
  if (chat.endedByVisitor) return;
  await prisma.liveChat.update({
    where: { id: chat.id },
    data: { closedAt: chat.closedAt ?? new Date(), endedByVisitor: true, tokenHash: sha256(randomBytes(24).toString("base64url")) },
  });
  await purgeChatImages(chat.id);
  void clearPing(chat.id);
  if (chat.tgThreadId) void syncThread(chat.id);
}

/**
 * Support answers from the admin panel: stored like a Telegram reply (the visitor's widget picks it up)
 * and added to the conversation's Telegram message. A bare «#پایان» only hands the chat back to the AI.
 * Returns an error text or null.
 */
export async function adminReply(chat: LiveChat, text: string, author: string, img?: { image: ChatImage; jpeg: Buffer }, about?: ImageRef | null) {
  if (chat.endedByVisitor) return "مشتری این گفتگو را بسته؛ پیام به او نمی‌رسد.";
  if (chat.closedAt) await prisma.liveChat.update({ where: { id: chat.id }, data: { closedAt: null } }); // answering reopens it
  text = await supportReplied(chat.id, text);
  if (!text && !img) {
    // Just «#پایان»: back to the AI (nothing for the visitor); a waiting visitor message gets its answer now.
    void syncThread(chat.id);
    void import("./ai").then((m) => m.answerLiveChat(chat.id));
    return null;
  }
  const row = await addMessage(chat.id, "ADMIN", text, { author: author.slice(0, 60), image: img?.image, replyToId: about?.id });
  // Into Telegram in the background: the visitor already has the reply, the panel needn't wait.
  void (async () => {
    if (img) {
      const tgId = await sendPhotoToSupport(img.jpeg, `📷 ${label(chat)} <i>از پنل (${esc(author)})</i>${text ? `\n${esc(text)}` : ""}`, about?.tg ?? (await threadIdOf(chat.id)));
      await prisma.liveChatMessage.update({ where: { id: row.id }, data: { tgMessageId: tgId } });
    }
    await syncThread(chat.id);
  })().catch((e) => console.error("[livechat] panel reply to Telegram failed:", e instanceof Error ? e.message : e));
  return null;
}

/** Open conversations with activity in the last 3 days, newest first (Telegram /chats). */
export function openChats() {
  return prisma.liveChat.findMany({
    where: { closedAt: null, lastMessageAt: { gt: new Date(Date.now() - 3 * 86_400_000) } },
    orderBy: { lastMessageAt: "desc" },
    take: 15,
  });
}

export function lastVisitorMessage(chatId: string) {
  return prisma.liveChatMessage.findFirst({ where: { chatId, sender: "VISITOR" }, orderBy: { createdAt: "desc" } });
}

/** Is the visitor on the site right now (their widget polled recently)? */
export const visitorOnline = (chat: Pick<LiveChat, "visitorSeenAt">, now = Date.now()) => Boolean(chat.visitorSeenAt && now - chat.visitorSeenAt.getTime() < ONLINE_MS);

/** Background job: re-syncs conversations with visitor messages from the last 24 h that never reached Telegram. */
export async function retryUndelivered() {
  const rows = await prisma.liveChatMessage.findMany({
    where: { sender: "VISITOR", tgMessageId: null, createdAt: { gt: new Date(Date.now() - 86_400_000) } },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { chatId: true },
  });
  // The conversation message lists them all (a photo as «📷 تصویر»; it's in the admin panel).
  for (const chatId of new Set(rows.map((r) => r.chatId))) {
    if (!(await syncThread(chatId))) return; // still failing: try again next round
  }
}

/** Background job: drop conversations idle for half a year, and any images a closed conversation still has. */
export async function pruneLiveChats() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  const gone = await prisma.liveChat.findMany({ where: { lastMessageAt: { lt: cutoff } }, select: { id: true } });
  if (gone.length) {
    await prisma.liveChat.deleteMany({ where: { id: { in: gone.map((g) => g.id) } } });
    await removeChatFiles(gone.map((g) => g.id));
  }
  const left = await prisma.liveChat.findMany({ where: { closedAt: { not: null }, messages: { some: { image: { not: Prisma.DbNull } } } }, select: { id: true } });
  for (const c of left) await purgeChatImages(c.id);
}
