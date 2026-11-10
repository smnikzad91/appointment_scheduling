import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Prisma } from "@appointment-scheduling/database";
import { prisma } from "@/lib/prisma";
import type { StreamUsage } from "./aiClient";

const execFileAsync = promisify(execFile);

// ---------- Settings (/admin/live-chat → «دستیار هوشمند») ----------

export type LiveChatAiSettings = { aiEnabled: boolean; handoverPhone: string; tomanPerUsd: number | null };
export const LIVECHAT_AI_DEFAULTS: LiveChatAiSettings = { aiEnabled: true, handoverPhone: "09119100991", tomanPerUsd: null };

export async function getLiveChatAiSettings(): Promise<LiveChatAiSettings> {
  const s = await prisma.liveChatSettings.findUnique({ where: { id: "singleton" } });
  return s ? { aiEnabled: s.aiEnabled, handoverPhone: s.handoverPhone, tomanPerUsd: s.tomanPerUsd } : LIVECHAT_AI_DEFAULTS;
}

export async function saveLiveChatAiSettings(v: LiveChatAiSettings) {
  await prisma.liveChatSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...v }, update: v });
}

// ---------- Cost of every AI answer ----------

/**
 * One row per AI answer. OpenRouter generations (model "openrouter/…", id "gen-…") are settled from
 * GET https://openrouter.ai/api/v1/generation?id=… (total_cost = what the credit was charged) with
 * LIVECHAT_OPENROUTER_API_KEY — the key of the OpenRouter account 9Router uses. Others are "untracked".
 * OpenRouter refuses Iranian IPs and Node's TLS fingerprint, so this goes through curl with a browser
 * User-Agent and, when set, LIVECHAT_AI_COST_PROXY (any curl -x value, e.g. http://127.0.0.1:20171).
 */
const isOpenRouter = (model: string, id: string | null) => model.startsWith("openrouter/") && Boolean(id?.startsWith("gen-"));
const MAX_ATTEMPTS = 30; // checks every 30 s (~15 min): generation stats can take a while to appear

/** Called after a successful answer; never throws. */
export async function recordAiUsage(r: { chatId: string; model: string; generationId: string | null; usage: StreamUsage | null }) {
  try {
    await prisma.liveChatAiUsage.create({
      data: {
        chatId: r.chatId,
        model: r.model.slice(0, 160),
        generationId: r.generationId?.slice(0, 100) ?? null,
        promptTokens: r.usage?.prompt_tokens ?? null,
        cachedTokens: r.usage?.prompt_tokens_details?.cached_tokens ?? null,
        completionTokens: r.usage?.completion_tokens ?? null,
        status: isOpenRouter(r.model, r.generationId) && process.env.LIVECHAT_OPENROUTER_API_KEY ? "pending" : "untracked",
      },
    });
  } catch (err) {
    console.warn("[livechat-ai] usage record failed:", err instanceof Error ? err.message : err);
  }
}

type Generation = { total_cost?: number; native_tokens_prompt?: number; native_tokens_completion?: number; native_tokens_cached?: number };

async function fetchGeneration(id: string): Promise<Generation | null> {
  const key = process.env.LIVECHAT_OPENROUTER_API_KEY?.trim();
  if (!key) return null;
  const proxy = process.env.LIVECHAT_AI_COST_PROXY?.trim();
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-sS", "--max-time", "20", "-w", "\n%{http_code}",
      ...(proxy ? ["-x", proxy] : []),
      "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "-H", "Accept: application/json",
      "-H", `Authorization: Bearer ${key}`,
      `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(id)}`,
    ],
    { timeout: 25_000 },
  ).catch(() => ({ stdout: "\n000" }));
  const nl = stdout.lastIndexOf("\n");
  const status = stdout.slice(nl + 1).trim();
  if (status === "404") return null; // not there yet
  if (status !== "200") throw new Error(`OpenRouter generation ${status}`);
  return ((JSON.parse(stdout.slice(0, nl)) as { data?: Generation }).data ?? null);
}

/** Background job (instance 0, every 30 s): fetch the exact cost of pending OpenRouter answers. */
export async function settleAiCosts() {
  if (!process.env.LIVECHAT_OPENROUTER_API_KEY) return;
  const rows = await prisma.liveChatAiUsage.findMany({
    where: { status: "pending", createdAt: { lt: new Date(Date.now() - 5000) } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  for (const r of rows) {
    try {
      const g = r.generationId ? await fetchGeneration(r.generationId) : null;
      if (g && typeof g.total_cost === "number") {
        await prisma.liveChatAiUsage.update({
          where: { id: r.id },
          data: {
            status: "settled",
            costUsd: new Prisma.Decimal(g.total_cost),
            promptTokens: g.native_tokens_prompt ?? r.promptTokens,
            completionTokens: g.native_tokens_completion ?? r.completionTokens,
            cachedTokens: g.native_tokens_cached ?? r.cachedTokens,
            attempts: { increment: 1 },
          },
        });
      } else {
        await prisma.liveChatAiUsage.update({ where: { id: r.id }, data: { attempts: { increment: 1 }, ...(r.attempts + 1 >= MAX_ATTEMPTS ? { status: "failed" } : {}) } });
      }
    } catch (err) {
      console.warn("[livechat-ai] cost settle failed:", err instanceof Error ? err.message : err);
      return; // OpenRouter unreachable: try again next round
    }
  }
}

// ---------- Admin «هزینه دستیار» ----------

type Period = { replies: number; chats: number; usd: number; untracked: number; pending: number };

async function period(since: Date | null): Promise<Period> {
  const where = since ? Prisma.sql`WHERE u."createdAt" >= ${since}` : Prisma.empty;
  const [r] = await prisma.$queryRaw<{ replies: number; chats: number; usd: string | null; untracked: number; pending: number }[]>`
    SELECT count(*)::int AS "replies", count(DISTINCT u."chatId")::int AS "chats",
      coalesce(sum(u."costUsd"), 0)::text AS "usd",
      count(*) FILTER (WHERE u."status" IN ('untracked', 'failed'))::int AS "untracked",
      count(*) FILTER (WHERE u."status" = 'pending')::int AS "pending"
    FROM "live_chat_ai_usage" u ${where}`;
  return { replies: r?.replies ?? 0, chats: r?.chats ?? 0, usd: Number(r?.usd ?? 0), untracked: r?.untracked ?? 0, pending: r?.pending ?? 0 };
}

export async function aiCostSummary() {
  const now = Date.now();
  // Midnight in Tehran (UTC+3:30, no daylight saving since 2022).
  const today = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date())}T00:00:00+03:30`);
  const [settings, d1, d7, d30, all, models, costliest, recent] = await Promise.all([
    getLiveChatAiSettings(),
    period(today),
    period(new Date(now - 7 * 86_400_000)),
    period(new Date(now - 30 * 86_400_000)),
    period(null),
    prisma.$queryRaw<{ model: string; replies: number; usd: string }[]>`
      SELECT u."model", count(*)::int AS "replies", coalesce(sum(u."costUsd"), 0)::text AS "usd"
      FROM "live_chat_ai_usage" u WHERE u."createdAt" >= ${new Date(now - 30 * 86_400_000)}
      GROUP BY u."model" ORDER BY count(*) DESC LIMIT 10`,
    prisma.$queryRaw<{ chatId: string; code: string | null; name: string | null; replies: number; usd: string }[]>`
      SELECT u."chatId", c."code", c."name", count(*)::int AS "replies", coalesce(sum(u."costUsd"), 0)::text AS "usd"
      FROM "live_chat_ai_usage" u LEFT JOIN "live_chats" c ON c."id" = u."chatId"
      WHERE u."createdAt" >= ${new Date(now - 30 * 86_400_000)} AND u."chatId" IS NOT NULL
      GROUP BY u."chatId", c."code", c."name" ORDER BY sum(u."costUsd") DESC NULLS LAST, count(*) DESC LIMIT 10`,
    prisma.liveChatAiUsage.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { chat: { select: { code: true } } } }),
  ]);
  return {
    tomanPerUsd: settings.tomanPerUsd,
    periods: { today: d1, week: d7, month: d30, all },
    models: models.map((m) => ({ model: m.model, replies: m.replies, usd: Number(m.usd) })),
    costliest: costliest.map((c) => ({ chatId: c.chatId, code: c.code, name: c.name, replies: c.replies, usd: Number(c.usd) })),
    recent: recent.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      chatId: r.chatId,
      code: r.chat?.code ?? null,
      model: r.model,
      status: r.status,
      usd: r.costUsd === null ? null : Number(r.costUsd),
      promptTokens: r.promptTokens,
      cachedTokens: r.cachedTokens,
      completionTokens: r.completionTokens,
    })),
  };
}
export type AiCostSummary = Awaited<ReturnType<typeof aiCostSummary>>;
