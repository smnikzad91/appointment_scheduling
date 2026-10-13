/**
 * Sign-up «از کجا با ما آشنا شدید؟» (salon and independent sign-up). Keys match apps/api
 * src/auth/signup-source.ts; OTHER asks for their own words (signupSourceNote).
 */

export type SignupSource = "INSTAGRAM" | "GOOGLE" | "FRIEND" | "COLLEAGUE" | "TELEGRAM" | "ADVERTISEMENT" | "CUSTOMER" | "OTHER";

export const SIGNUP_SOURCE_LABEL: Record<SignupSource, string> = {
  INSTAGRAM: "اینستاگرام",
  GOOGLE: "جستجو در گوگل",
  FRIEND: "معرفی دوستان یا آشنایان",
  COLLEAGUE: "معرفی همکار (سالن یا آرایشگر دیگر)",
  TELEGRAM: "تلگرام یا شبکه‌های اجتماعی دیگر",
  ADVERTISEMENT: "تبلیغات (بنر، پیامک، تراکت)",
  CUSTOMER: "از طرف مشتری‌ها",
  OTHER: "سایر",
};

export const SIGNUP_SOURCES = Object.keys(SIGNUP_SOURCE_LABEL) as SignupSource[];

export const SIGNUP_SOURCE_LABEL_EN: Record<SignupSource, string> = {
  INSTAGRAM: "Instagram",
  GOOGLE: "Google search",
  FRIEND: "Friends or acquaintances",
  COLLEAGUE: "A colleague (another salon or stylist)",
  TELEGRAM: "Telegram / other social media",
  ADVERTISEMENT: "Advertising (banner, SMS, flyer)",
  CUSTOMER: "Customers",
  OTHER: "Other",
};
