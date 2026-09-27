import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiLogin } from "@/lib/apiAuth";
import { ApiError } from "@/lib/apiClient";
import { normalizeDigits } from "@/lib/persian";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        // Email or mobile number — apps/api's /auth/login matches either. Stylists invited by a
        // salon owner only have a phone, so this must not be email-only.
        identifier: { label: "Email or phone", type: "text" },
        password:   { label: "Password",       type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        try {
          const { accessToken, user } = await apiLogin(
            normalizeDigits((credentials.identifier as string).trim()),
            credentials.password as string,
          );

          return {
            id:             user.id,
            email:          user.email ?? undefined,
            name:           `${user.firstName} ${user.lastName}`,
            role:           user.role,
            avatar:         user.avatarUrl ?? "",
            createdAt:      user.createdAt,
            apiAccessToken: accessToken,
          };
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) return null;
          throw err;
        }
      },
    }),
  ],
});
