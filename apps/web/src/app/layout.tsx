import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import SessionWrapper from "@/components/common/SessionWrapper";
import ToastProvider from "@/components/common/ToastProvider";
import AgGridSetup from "@/components/common/AgGridSetup";
import ClientErrorReporter from "@/components/common/ClientErrorReporter";
import { InAppHistoryTracker } from "@/lib/inAppHistory";
import { VisitTracker } from "@/lib/analytics/client";
import SplashScreen from "@/components/common/SplashScreen";
import FormDraftKeeper from "@/components/common/FormDraftKeeper";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, SITE_KEYWORDS } from "@/lib/site";

// viewport-fit=cover lets the app shell paint under the notch / home indicator (it pads itself
// with env(safe-area-inset-*)); the theme color tints the status bar to match the app bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#121319" }, // brand dark (branding/)
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    siteName: SITE_NAME,
    locale: "fa_IR",
    type: "website",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
      <head>
        <Script id="theme-lang-init" strategy="beforeInteractive" src="/theme-init.js" />
        {/* Brand icons (branding/): app/favicon.ico is served at /favicon.ico (16/32/48). */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="preload" href="/fonts/Vazirmatn-Variable.woff2" as="font" type="font/woff2" crossOrigin="" />
        {/* Installability tags go here, not in `metadata`: Next streams metadata into <body> for
            regular browsers, and Chrome/Safari only read these from <head> — without them the
            app isn't installable and `beforeinstallprompt` never fires. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Google Search Console ownership of nobatet.app — must stay in <head> (not metadata, which streams into <body>) */}
        <meta name="google-site-verification" content="wxv6MrsgaSDIs550uwXxWHMgB0eOkih6SE2E9k_vu_E" />
      </head>
      <body className="dark:bg-gray-900">
        {/* Once per session; hidden before paint on later loads (theme-init.js). */}
        <SplashScreen />
        <AgGridSetup />
        <ClientErrorReporter />
        <InAppHistoryTracker />
        <VisitTracker />
        <ServiceWorkerRegister />
        <FormDraftKeeper />
        <SessionWrapper>
          <LanguageProvider>
            <ThemeProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </ThemeProvider>
            <ToastProvider />
          </LanguageProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
