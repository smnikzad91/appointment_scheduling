import { Prisma } from "@appointment-scheduling/database";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** The platform admin's session (null otherwise) and the name their panel replies carry. */
export async function adminSession() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") return null;
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { firstName: true, lastName: true } });
  return { id: session.user.id, author: [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "پشتیبانی" };
}

export type ChatFilter = "all" | "waiting" | "open" | "closed" | "ended";
export const CHAT_FILTERS: ChatFilter[] = ["all", "waiting", "open", "closed", "ended"];

// The newest non-system sender of a chat — «منتظر جواب» = open and the visitor spoke last.
const LAST_SENDER = Prisma.sql`(SELECT m."sender" FROM "live_chat_messages" m WHERE m."chatId" = c."id" AND m."sender" <> 'SYSTEM' ORDER BY m."createdAt" DESC LIMIT 1)`;

function filterSql(f: ChatFilter) {
  switch (f) {
    case "waiting":
      return Prisma.sql`c."closedAt" IS NULL AND (${LAST_SENDER} = 'VISITOR' OR c."mode" = 'PENDING')`;
    case "open":
      return Prisma.sql`c."closedAt" IS NULL`;
    case "closed":
      return Prisma.sql`c."closedAt" IS NOT NULL AND NOT c."endedByVisitor"`;
    case "ended":
      return Prisma.sql`c."endedByVisitor"`;
    default:
      return Prisma.sql`TRUE`;
  }
}

export type AdminChatRow = {
  id: string;
  code: string;
  name: string | null;
  contact: string | null;
  userId: string | null;
  closedAt: Date | null;
  endedByVisitor: boolean;
  mode: "AI" | "PENDING" | "HUMAN";
  visitorSeenAt: Date | null;
  lastMessageAt: Date;
  rating: number | null;
  lastSender: "VISITOR" | "ADMIN" | "AI" | null;
  lastText: string | null;
  total: number;
  undelivered: number;
};

/** The latest 60 conversations matching a filter and a search (code, name, mobile). */
export function listChats(filter: ChatFilter, q: string) {
  const term = q.trim().replace(/^#/, "");
  const like = `%${term}%`;
  const search = term ? Prisma.sql`AND (c."code" ILIKE ${like} OR c."name" ILIKE ${like} OR c."contact" ILIKE ${like})` : Prisma.empty;
  return prisma.$queryRaw<AdminChatRow[]>`
    SELECT c."id", c."code", c."name", c."contact", c."userId", c."closedAt", c."endedByVisitor", c."mode"::text AS "mode", c."visitorSeenAt", c."lastMessageAt", c."rating",
      ${LAST_SENDER} AS "lastSender",
      (SELECT CASE WHEN m."text" = '' AND m."image" IS NOT NULL THEN '📷 تصویر' ELSE m."text" END FROM "live_chat_messages" m
        WHERE m."chatId" = c."id" AND m."sender" <> 'SYSTEM' ORDER BY m."createdAt" DESC LIMIT 1) AS "lastText",
      (SELECT count(*)::int FROM "live_chat_messages" m WHERE m."chatId" = c."id" AND m."sender" <> 'SYSTEM') AS "total",
      (SELECT count(*)::int FROM "live_chat_messages" m WHERE m."chatId" = c."id" AND m."sender" = 'VISITOR' AND m."tgMessageId" IS NULL) AS "undelivered"
    FROM "live_chats" c
    WHERE ${filterSql(filter)} ${search}
    ORDER BY c."lastMessageAt" DESC
    LIMIT 60`;
}

export async function chatCounts(): Promise<Record<ChatFilter, number>> {
  const [r] = await prisma.$queryRaw<Record<ChatFilter, number>[]>`
    SELECT count(*)::int AS "all",
      count(*) FILTER (WHERE c."closedAt" IS NULL AND (${LAST_SENDER} = 'VISITOR' OR c."mode" = 'PENDING'))::int AS "waiting",
      count(*) FILTER (WHERE c."closedAt" IS NULL)::int AS "open",
      count(*) FILTER (WHERE c."closedAt" IS NOT NULL AND NOT c."endedByVisitor")::int AS "closed",
      count(*) FILTER (WHERE c."endedByVisitor")::int AS "ended"
    FROM "live_chats" c`;
  return r;
}

/** «راضی بودید؟» over the last 30 days: 👍 and 👎 counts. */
export async function ratingSummary() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [up, down] = await Promise.all([
    prisma.liveChat.count({ where: { rating: 1, ratedAt: { gte: since } } }),
    prisma.liveChat.count({ where: { rating: -1, ratedAt: { gte: since } } }),
  ]);
  return { up, down };
}

/** Sidebar badge + chime: open conversations waiting for a reply, and the newest visitor message in an open one. */
export async function waitingSummary() {
  const [r] = await prisma.$queryRaw<{ n: number; last: Date | null }[]>`
    SELECT
      (SELECT count(*)::int FROM "live_chats" c WHERE c."closedAt" IS NULL AND (${LAST_SENDER} = 'VISITOR' OR c."mode" = 'PENDING')) AS "n",
      -- the chime: visitor messages in chats a person handles (the AI answers the rest; a hand-over request counts too)
      (SELECT greatest(max(m."createdAt"), max(c."handoverAt")) FROM "live_chat_messages" m JOIN "live_chats" c ON c."id" = m."chatId" WHERE m."sender" = 'VISITOR' AND c."closedAt" IS NULL AND c."mode" <> 'AI') AS "last"`;
  return { n: r?.n ?? 0, last: r?.last ? r.last.getTime() : 0 };
}
