// Separate from "@/lib/apiClient" (which is server-only, used for NextAuth's login proxy).
// The salon page and its booking flow call apps/api directly from the browser — public salon
// browsing needs no session, and a booking's own auth comes from OTP verification, not NextAuth.
// The browser uses the public NEXT_PUBLIC_API_URL (baked in at build). On the server — SSR of
// salon pages, the showcase, sitemap, OG images — it uses the internal API_URL (127.0.0.1 in
// production, read at runtime): going out through the public URL would leave the box and come back
// through Cloudflare, adding latency and failing whenever an edge address is unreachable.
const API_URL =
  typeof window === "undefined"
    ? (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001");

export class SalonApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const RETRY_DELAYS_MS = [300, 600];
// Connection-level failures of a restarting API instance: refused, reset, or (undici) a pooled
// keep-alive socket the other side closed as it shut down.
const RETRYABLE_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "UND_ERR_SOCKET", "UND_ERR_CLOSED"]);

/** Node's fetch wraps socket errors: TypeError("fetch failed") with the real one as `cause`. */
function connectionErrorCode(err: unknown): string | undefined {
  for (let e: unknown = err, depth = 0; e && depth < 4; e = (e as { cause?: unknown }).cause, depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/**
 * fetch, retried on the server when the API refused, reset or closed the connection — a pm2 reload
 * blip — up to twice (300 ms, 600 ms). Only GET/HEAD, which are safe to repeat; never on an HTTP
 * error response (that's an answer, not a blip), and never in the browser.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const retries = typeof window === "undefined" && (method === "GET" || method === "HEAD") ? RETRY_DELAYS_MS : [];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      const code = connectionErrorCode(err);
      if (attempt >= retries.length || !code || !RETRYABLE_CODES.has(code)) throw err;
      await new Promise((resolve) => setTimeout(resolve, retries[attempt]));
    }
  }
}

export async function salonApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithRetry(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? res.statusText;
    throw new SalonApiError(res.status, Array.isArray(message) ? message.join(", ") : message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
