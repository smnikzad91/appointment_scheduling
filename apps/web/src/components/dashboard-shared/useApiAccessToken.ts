"use client";

import { useSession } from "next-auth/react";

/** The apps/api JWT for the logged-in user (any role), or null while the session is still loading. */
export function useApiAccessToken(): string | null {
  const { data: session } = useSession();
  return session?.apiAccessToken ?? null;
}
