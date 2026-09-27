import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiLogin } from "@/lib/apiAuth";
import { ApiError } from "@/lib/apiClient";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const { accessToken, user } = await apiLogin(
            credentials.email as string,
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
