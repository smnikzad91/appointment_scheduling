import { headers } from "next/headers";
import { auth } from "@/auth";
import { apiFetch } from "./apiClient";

// Who is calling one of apps/web's own routes (uploads, receipts, profile, password, SMS
// preferences, support tickets): the website's NextAuth session, or — for the Android app, which
// signs in against apps/api — `Authorization: Bearer <apps/api token>`, checked by asking apps/api
// (GET /auth/me: valid signature, not expired, account still exists). Use it instead of `auth()` in
// any route the app needs; it returns the same `{ user: { id, role } }` shape.

export interface RequestSession {
  user: { id: string; role: string };
}

interface MeResponse {
  id: string;
  role: string;
}

// A short memory of checked tokens, so a screen that loads several things doesn't ask apps/api
// each time. Never longer than a minute: a deleted account loses access within it.
const CACHE_MS = 60_000;
const MAX_CACHED = 500;
const checked = new Map<string, { session: RequestSession; until: number }>();

async function fromBearer(token: string): Promise<RequestSession | null> {
  const hit = checked.get(token);
  if (hit && hit.until > Date.now()) return hit.session;
  try {
    const me = await apiFetch<MeResponse>("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    const session = { user: { id: me.id, role: me.role } };
    if (checked.size >= MAX_CACHED) checked.delete(checked.keys().next().value!);
    checked.set(token, { session, until: Date.now() + CACHE_MS });
    return session;
  } catch {
    checked.delete(token);
    return null; // invalid/expired token, deleted account, or apps/api unreachable: not signed in
  }
}

export async function requestSession(): Promise<RequestSession | null> {
  const authorization = (await headers()).get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (bearer) return fromBearer(bearer);
  const session = await auth();
  return session?.user?.id ? { user: { id: session.user.id, role: session.user.role } } : null;
}
