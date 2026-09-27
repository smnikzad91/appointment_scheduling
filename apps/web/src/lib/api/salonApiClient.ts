// Separate from "@/lib/apiClient" (which is server-only, used for NextAuth's login proxy).
// The salon page and its booking flow call apps/api directly from the browser — public salon
// browsing needs no session, and a booking's own auth comes from OTP verification, not NextAuth —
// so this uses the NEXT_PUBLIC_ variable, readable both server-side (for the page's SSR fetch) and
// client-side (for the booking flow's fetches).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

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
