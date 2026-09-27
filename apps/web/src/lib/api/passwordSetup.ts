import { salonApiFetch } from "./salonApiClient";
import { SITE_URL } from "@/lib/site";

// One-time "set your password" links for invited stylists (apps/api auth/password-setup).

export interface PasswordSetupInfo {
  firstName: string;
  phone: string | null;
  salonName: string | null;
  /** false = the stylist already has a password and this link resets it. */
  firstTime: boolean;
  expiresAt: string;
}

export function getPasswordSetup(token: string) {
  return salonApiFetch<PasswordSetupInfo>(`/auth/password-setup/${encodeURIComponent(token)}`, { cache: "no-store" });
}

export function completePasswordSetup(token: string, password: string) {
  return salonApiFetch<{ phone: string | null }>("/auth/password-setup", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

/** The page a stylist opens from the link the salon owner shares (on the public site address). */
export function setupLinkUrl(token: string) {
  return `${SITE_URL}/set-password/${token}`;
}
