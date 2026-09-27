import localFont from "next/font/local";

// Self-hosted (no Google Fonts CDN) — required for the public salon pages so
// they load nothing that might be blocked in Iran. Scoped to /s/[slug] only;
// the rest of the app still uses the Google Fonts Vazirmatn link in the root layout.
export const vazirmatn = localFont({
  src: "./Vazirmatn-Variable.woff2",
  variable: "--font-vazirmatn-salon",
  display: "swap",
  weight: "100 900",
});
