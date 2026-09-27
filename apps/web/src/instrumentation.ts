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
  void sweep();
  setInterval(sweep, DAY_MS).unref();
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
