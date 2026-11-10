import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Node.js-only imports (no Prisma, no bcrypt).
// Used by middleware. Full provider config lives in auth.ts.
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id             = user.id;
        token.role           = user.role;
        token.avatar         = user.avatar ?? "";
        token.createdAt      = (user as { createdAt?: string }).createdAt ?? "";
        token.apiAccessToken = user.apiAccessToken;
      }
      if (trigger === "update" && session?.avatar !== undefined) {
        token.avatar = session.avatar;
      }
      // The session (30 days, renewed on use) outlives apps/api's token (JWT_EXPIRES_IN, 7d): once
      // that has expired every API call answers 401, so end the session (null clears the cookie)
      // and the user signs in again for a fresh token.
      const exp = apiTokenExpiry(token.apiAccessToken);
      if (exp !== null && exp * 1000 <= Date.now()) return null;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id        = token.id as string;
        session.user.role      = token.role as string;
        session.user.avatar    = token.avatar as string;
        session.user.createdAt = token.createdAt as string;
        session.apiAccessToken = token.apiAccessToken as string | undefined;
      }
      return session;
    },
  },
};

/** `exp` (seconds) of an apps/api JWT, read without verifying (apps/api does that); null if unreadable. */
export function apiTokenExpiry(apiToken: unknown): number | null {
  if (typeof apiToken !== "string") return null;
  try {
    const part = apiToken.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}
