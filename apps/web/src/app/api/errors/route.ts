import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/errorLog";

// Browser-side errors reported by ClientErrorReporter / global-error.tsx. Public (errors happen on
// public pages too), so the payload is size-capped and each IP is rate-limited.

const MAX_BODY_BYTES = 16_000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

// Per-instance, in-memory — good enough to stop one broken page (or one abuser) flooding the table.
const recentByIp = new Map<string, { windowStart: number; count: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = recentByIp.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    if (recentByIp.size > 5_000) recentByIp.clear();
    recentByIp.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function str(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined;
}

/** Pathname of the page the error happened on (no query string — it can carry personal data). */
function pagePath(value: unknown, origin: string): string | undefined {
  const url = str(value, 1_000);
  if (!url) return undefined;
  try {
    return new URL(url, origin).pathname;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return new NextResponse(null, { status: 429 });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const message = str(body.message, 2_000);
  if (!message) return new NextResponse(null, { status: 400 });

  const error = new Error(message);
  error.stack = str(body.stack, 10_000) ?? message;

  const session = await auth();

  await logError({
    error,
    source: "WEB_CLIENT",
    path: pagePath(body.url, req.nextUrl.origin),
    userId: session?.user?.id,
    userAgent: req.headers.get("user-agent") ?? undefined,
    context: {
      kind: str(body.kind, 50),
      digest: str(body.digest, 100),
      componentStack: str(body.componentStack, 5_000),
    },
  });

  return new NextResponse(null, { status: 204 });
}
