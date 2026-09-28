import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiLogin, apiVerifyOtp, type ApiAuthResponse } from "@/lib/apiAuth";
import { ApiError } from "@/lib/apiClient";
import { normalizeDigits } from "@/lib/persian";
import { logError } from "@/lib/errorLog";
import { authConfig } from "./auth.config";

/** Reach the client as `result.code`, so the sign-in form can say what to do instead. */
class NoAccountError extends CredentialsSignin {
  code = "no_account";
}
class StaffUsePasswordError extends CredentialsSignin {
  code = "staff_password";
}

function toSessionUser({ accessToken, user }: ApiAuthResponse) {
  return {
    id:             user.id,
    email:          user.email ?? undefined,
    name:           `${user.firstName} ${user.lastName}`,
    role:           user.role,
    avatar:         user.avatarUrl ?? "",
    createdAt:      user.createdAt,
    apiAccessToken: accessToken,
  };
}

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
          return toSessionUser(
            await apiLogin(normalizeDigits((credentials.identifier as string).trim()), credentials.password as string),
          );
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) return null;
          // NextAuth swallows errors thrown here and shows a generic sign-in failure, so an
          // unreachable or failing apps/api would otherwise never reach the error log.
          await logError({ error: err, method: "POST", path: "/api/auth/callback/credentials", context: { step: "apiLogin" } });
          throw err;
        }
      },
    }),
    // Every panel (admin, salon, stylist, customer) can also sign in with an SMS code, requested
    // from the browser straight from apps/api (/auth/otp/request). While the api's OTP bypass is
    // on (no delivering SMS driver) staff numbers are refused there — they use the password.
    CredentialsProvider({
      id: "otp",
      name: "SMS code",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        code:  { label: "Code",  type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;

        try {
          return toSessionUser(
            await apiVerifyOtp(normalizeDigits(credentials.phone as string), normalizeDigits(credentials.code as string)),
          );
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) return null;
          if (err instanceof ApiError && err.status === 404) throw new NoAccountError();
          if (err instanceof ApiError && err.status === 403) throw new StaffUsePasswordError();
          await logError({ error: err, method: "POST", path: "/api/auth/callback/otp", context: { step: "apiVerifyOtp" } });
          throw err;
        }
      },
    }),
  ],
});
