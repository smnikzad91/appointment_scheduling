import type { Instrumentation } from "next";

const DAY_MS = 24 * 60 * 60 * 1000;

// Once at startup and then daily: delete salon/stylist photos no row references any more
// (abandoned uploads, rows removed by cascades). Replaced/removed photos are normally deleted
// right away via DELETE /api/upload; this catches whatever slipped past.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { pruneOrphanedUploads } = await import("@/lib/uploadCleanup");
  const sweep = () =>
    pruneOrphanedUploads()
      .then((n) => n > 0 && console.info(`[uploads] removed ${n} unused photo(s)`))
      .catch(async (error) => {
        const { logError } = await import("@/lib/errorLog");
        await logError({ error, path: "instrumentation:pruneOrphanedUploads" });
      });
  // …and public-site analytics older than 120 days (lib/analytics/record.ts)
  const { pruneOldVisits } = await import("@/lib/analytics/record");
  const visitSweep = () => pruneOldVisits().catch(() => 0);
  void sweep();
  void visitSweep();
  setInterval(() => {
    void sweep();
    void visitSweep();
  }, DAY_MS).unref();

  // Live chat (lib/livechat), in one pm2 instance only: point the bot's webhook here, re-send visitor
  // messages Telegram refused (every 5 min) and drop chats idle for half a year (daily).
  if ((process.env.NODE_APP_INSTANCE ?? "0") === "0") {
    const chat = await import("@/lib/livechat/chats");
    const { ensureTelegramWebhook } = await import("@/lib/livechat/telegram");
    const { botToken, liveChatConfigured } = await import("@/lib/livechat/config");
    if (botToken()) void ensureTelegramWebhook();
    const retry = () => liveChatConfigured() && chat.retryUndelivered().catch((e) => console.error("[livechat] retry:", e instanceof Error ? e.message : e));
    const prune = () => chat.pruneLiveChats().catch((e) => console.error("[livechat] prune:", e instanceof Error ? e.message : e));
    const { settleAiCosts } = await import("@/lib/livechat/aiUsage");
    const settle = () => settleAiCosts().catch((e) => console.error("[livechat] AI cost:", e instanceof Error ? e.message : e));
    setInterval(settle, 30_000).unref();
    void prune();
    setInterval(retry, 5 * 60_000).unref();
    setInterval(prune, DAY_MS).unref();
  }
}

// Records server errors Next.js catches itself — uncaught throws in Server Components, route
// handlers, server actions and proxy.ts — to error_logs (see src/lib/errorLog.ts). Errors a route
// catches on its own are logged at that call site with logError() instead.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // Prisma needs Node APIs; the edge runtime can only fall back to the console.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    console.error("[onRequestError]", request.path, error);
    return;
  }

  const { logError } = await import("@/lib/errorLog");
  const userAgent = request.headers["user-agent"];
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;

  await logError({
    error,
    method: request.method,
    path: request.path,
    statusCode: 500,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    context: { routePath: context.routePath, routeType: context.routeType, digest },
  });
};
