import { createHash, randomBytes, randomInt } from "node:crypto";
import { Prisma, type LiveChat, type LiveChatMessage, type LiveChatSender } from "@appointment-scheduling/database";
import { prisma } from "@/lib/prisma";
import { esc, sendPhotoToSupport, sendToSupport } from "./telegram";
import { imageOf, readChatImage, removeChatFiles, type ChatImage } from "./images";
import { CHAT_IMAGE_DELETED, MESSAGE_MAX, ONLINE_MS, type ChatMessageOut } from "./rules";
import { isReaction, type ImageReactions, type Reaction } from "./reactions";
import { matchAutoReply } from "./quickReplies";

/**
 * Site live chat («گفتگو با پشتیبانی»). A visitor's messages are stored and forwarded to the support
 * Telegram chat (LIVECHAT_TELEGRAM_ADMIN_ID) by the live-chat bot; support answers by replying to the
 * bot's message there, or from /admin/live-chat. The widget polls /api/livechat/poll for replies.
 */

export const CHAT_COOKIE = "nobatet_chat";
export const CHAT_COOKIE_DAYS = 30;
const HISTORY = 100;
const RETENTION_DAYS = 180;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const SENDER_OUT: Record<LiveChatSender, ChatMessageOut["sender"]> = { VISITOR: "visitor", ADMIN: "admin", SYSTEM: "system" };

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

/** The Telegram message of this chat's latest forwarded message (to thread replies there). */
async function lastTg(chatId: string) {
  const m = await prisma.liveChatMessage.findFirst({ where: { chatId, tgMessageId: { not: null } }, orderBy: { createdAt: "desc" }, select: { tgMessageId: true } });
  return m?.tgMessageId ?? null;
}

/** Support opened the conversation in the panel: the visitor's messages show ✓✓. */
export async function markSupportRead(chatId: string) {
  await prisma.liveChat.updateMany({ where: { id: chatId }, data: { supportReadAt: new Date() } });
}

/** The visitor had the chat open with support's replies on screen (admin transcript: «خوانده شد»). */
export async function markVisitorRead(chatId: string) {
  await prisma.liveChat.updateMany({ where: { id: chatId }, data: { visitorReadAt: new Date() } });
}

/** «پشتیبانی در حال نوشتن…» on the visitor's widget (sent while an admin types in the panel). */
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
 * («ویرایش‌شده»), and a note replying to the original goes to the Telegram support chat so the record
 * there stays true. Returns the saved caption, or null when there's no such image of theirs.
 */
export async function editImageCaption(chat: LiveChat, messageId: string, sender: "VISITOR" | "ADMIN", caption: string, author?: string) {
  const n = await prisma.liveChatMessage.updateMany({
    where: { id: messageId, chatId: chat.id, sender, image: { not: Prisma.DbNull } },
    data: { text: caption, editedAt: new Date() },
  });
  if (!n.count) return null;
  const row = await prisma.liveChatMessage.findUniqueOrThrow({ where: { id: messageId }, select: { text: true, tgMessageId: true } });
  const who = sender === "VISITOR" ? "" : ` <i>از پنل (${esc(author ?? "پشتیبانی")})</i>`;
  void sendToSupport(`✏️ ${label(chat)}${who} توضیح تصویر را ویرایش کرد:\n${row.text ? esc(row.text) : "<i>(بدون توضیح)</i>"}`, row.tgMessageId).catch((e) =>
    console.error("[livechat] caption edit note failed:", e instanceof Error ? e.message : e),
  );
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
  return row;
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

/** The details block Telegram shows for a conversation (intro + /info). */
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

const introHtml = async (chat: LiveChat, body: string, late = false) =>
  `🟢 گفتگوی جدید ${label(chat)}${late ? " <i>(با تأخیر)</i>" : ""}\n${await chatInfoHtml(chat)}\n\n${body}\n\n<i>برای جواب، روی همین پیام Reply کنید.</i>`;

/**
 * Saves a visitor message (text, or an image with an optional caption) and forwards it to Telegram.
 * `about` = the image this message comments on (from imageInChat): quoted in the chat, threaded under the photo in Telegram.
 */
export async function visitorSend(chat: LiveChat, text: string, img?: { image: ChatImage; jpeg: Buffer }, about?: ImageRef | null) {
  const first = (await prisma.liveChatMessage.count({ where: { chatId: chat.id } })) === 0;
  const row = await addMessage(chat.id, "VISITOR", text, { image: img?.image, replyToId: about?.id });
  // Replying to the previous Telegram message of this chat threads the conversation in Telegram.
  const prev = about?.tg ?? (first ? null : await lastTg(chat.id));
  const body = img ? `📷 ${esc(text)}`.trim() : esc(text);
  const html = first ? await introHtml(chat, body) : `💬 ${label(chat)}${about ? " <i>دربارهٔ تصویر</i>" : ""}\n${body}`;
  let delivered = false;
  let tgId: number | null = null;
  for (let attempt = 0; attempt < 2 && !delivered; attempt++) {
    try {
      tgId = img ? await sendPhotoToSupport(img.jpeg, html, prev) : await sendToSupport(html, prev);
      await prisma.liveChatMessage.update({ where: { id: row.id }, data: { tgMessageId: tgId } });
      delivered = true;
    } catch (e) {
      console.error("[livechat] forward failed:", e instanceof Error ? e.message : e);
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  if (text) await autoReply(chat, text, tgId).catch((e) => console.error("[livechat] auto reply failed:", e instanceof Error ? e.message : e));
  return { row, delivered };
}

/**
 * A quick reply marked «پاسخ خودکار» whose keyword is in the visitor's message goes out by itself (each
 * at most once per chat), labelled «پاسخ خودکار» for support; support sees a note under the message in Telegram.
 */
async function autoReply(chat: LiveChat, text: string, tgId: number | null) {
  const fresh = await prisma.liveChat.findUnique({ where: { id: chat.id }, select: { autoReplied: true, closedAt: true } });
  if (!fresh || fresh.closedAt) return;
  const reply = await matchAutoReply(text, fresh.autoReplied);
  if (!reply) return;
  await prisma.liveChat.update({ where: { id: chat.id }, data: { autoReplied: { push: reply.id } } });
  await addMessage(chat.id, "ADMIN", reply.text, { author: "پاسخ خودکار", auto: true });
  void sendToSupport(`🤖 ${label(chat)} پاسخ خودکار «${esc(reply.title)}» فرستاده شد.`, tgId).catch(() => {});
}

/** «راضی بودید؟» — the visitor's 👍 (1) / 👎 (-1) at the end; support hears it in the Telegram thread. */
export async function rateChat(chat: LiveChat, rating: 1 | -1) {
  await prisma.liveChat.update({ where: { id: chat.id }, data: { rating, ratedAt: new Date() } });
  const prev = await lastTg(chat.id);
  if (prev) void sendToSupport(`${rating > 0 ? "👍" : "👎"} ${label(chat)} از گفتگو ${rating > 0 ? "راضی بود" : "راضی نبود"}.`, prev).catch(() => {});
}

/** A quick reply sent by support (Telegram «/r key»): stored like a reply from that support member. */
export async function sendQuickReply(chat: LiveChat, text: string, tgMessageId: number, author: string | null) {
  if (chat.closedAt) await prisma.liveChat.update({ where: { id: chat.id }, data: { closedAt: null } }); // answering reopens it
  return addMessage(chat.id, "ADMIN", text, { tgMessageId, author });
}

/** Which conversation a Telegram reply belongs to. */
export async function chatByTelegramMessage(tgMessageId: number) {
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

/** Support closes it (Telegram /close or the panel). false = it was closed already. */
export async function closeChat(chat: LiveChat) {
  if (chat.closedAt) return false;
  await prisma.liveChat.update({ where: { id: chat.id }, data: { closedAt: new Date() } });
  await purgeChatImages(chat.id);
  await addMessage(chat.id, "SYSTEM", "پشتیبانی این گفتگو را بست. اگر سؤال دیگری دارید، گفتگوی تازه‌ای شروع کنید.");
  return true;
}

/** The visitor ends the conversation from the widget («بستن»): their token stops working, support is told. */
export async function endChatByVisitor(chat: LiveChat) {
  if (chat.endedByVisitor) return;
  await prisma.liveChat.update({
    where: { id: chat.id },
    data: { closedAt: chat.closedAt ?? new Date(), endedByVisitor: true, tokenHash: sha256(randomBytes(24).toString("base64url")) },
  });
  await purgeChatImages(chat.id);
  const prev = await lastTg(chat.id);
  if (!prev) return; // nothing ever reached Telegram
  await sendToSupport(`🔴 ${label(chat)} گفتگو را از سایت بست؛ جواب‌های بعدی به او نمی‌رسد.`, prev).catch((e) =>
    console.error("[livechat] end notice failed:", e instanceof Error ? e.message : e),
  );
}

/**
 * Support answers from the admin panel: stored like a Telegram reply (the visitor's widget picks it
 * up) and mirrored into the Telegram thread so it stays complete. Returns an error text or null.
 */
export async function adminReply(chat: LiveChat, text: string, author: string, img?: { image: ChatImage; jpeg: Buffer }, about?: ImageRef | null) {
  if (chat.endedByVisitor) return "مشتری این گفتگو را بسته؛ پیام به او نمی‌رسد.";
  if (chat.closedAt) await prisma.liveChat.update({ where: { id: chat.id }, data: { closedAt: null } }); // answering reopens it
  const row = await addMessage(chat.id, "ADMIN", text, { author: author.slice(0, 60), image: img?.image, replyToId: about?.id });
  const prev = about?.tg ?? (await lastTg(chat.id));
  // Mirror in the background: the visitor already has the reply, the panel needn't wait for Telegram.
  const mirror = `↩️ ${label(chat)} <i>از پنل (${esc(author)})${about ? " دربارهٔ تصویر" : ""}</i>\n${esc(text)}`;
  void (img ? sendPhotoToSupport(img.jpeg, mirror, prev) : sendToSupport(mirror, prev))
    .then((tgId) => prisma.liveChatMessage.update({ where: { id: row.id }, data: { tgMessageId: tgId } }))
    .catch((e) => console.error("[livechat] panel reply mirror failed:", e instanceof Error ? e.message : e));
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

/** Background job: re-sends visitor messages from the last 24 h that never reached Telegram. */
export async function retryUndelivered() {
  const rows = await prisma.liveChatMessage.findMany({
    where: { sender: "VISITOR", tgMessageId: null, createdAt: { gt: new Date(Date.now() - 86_400_000) } },
    orderBy: { createdAt: "asc" },
    take: 20,
    include: { chat: true },
  });
  const introduced = new Set<string>();
  for (const { chat, ...msg } of rows) {
    const intro = !introduced.has(chat.id) && !(await lastTg(chat.id));
    introduced.add(chat.id);
    const html = intro ? await introHtml(chat, esc(msg.text), true) : `💬 ${label(chat)} <i>(با تأخیر)</i>\n${esc(msg.text)}`;
    try {
      const image = imageOf(msg.image);
      const jpeg = image ? await readChatImage(image.file) : null;
      const tgId = jpeg ? await sendPhotoToSupport(jpeg, `📷 ${html}`) : await sendToSupport(html);
      await prisma.liveChatMessage.update({ where: { id: msg.id }, data: { tgMessageId: tgId } });
    } catch (e) {
      console.error("[livechat] retry failed:", e instanceof Error ? e.message : e);
      return; // still failing: try again next round
    }
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
