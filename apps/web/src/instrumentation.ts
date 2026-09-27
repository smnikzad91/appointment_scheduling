import type { Instrumentation } from "next";

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
