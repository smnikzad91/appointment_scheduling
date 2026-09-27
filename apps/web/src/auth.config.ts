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
