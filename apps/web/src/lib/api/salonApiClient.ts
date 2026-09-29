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

export async function salonApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
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
