/**
 * Sign-up «از کجا با ما آشنا شدید؟» answers, stored on Salon.signupSource. apps/web has the Persian
 * labels (lib/signupSource.ts) — keep the two key lists in sync. OTHER comes with signupSourceNote.
 */
export const SIGNUP_SOURCES = [
  "INSTAGRAM",
  "GOOGLE",
  "FRIEND",
  "COLLEAGUE",
  "TELEGRAM",
  "ADVERTISEMENT",
  "CUSTOMER",
  "OTHER",
] as const;

export type SignupSource = (typeof SIGNUP_SOURCES)[number];
