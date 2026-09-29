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
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

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
  keywords: ["نوبت‌دهی آنلاین", "رزرو آنلاین سالن زیبایی", "نرم‌افزار آرایشگاه", "مدیریت سالن", "نوبتت"],
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
      </head>
      <body className="dark:bg-gray-900">
        <AgGridSetup />
        <ClientErrorReporter />
        <ServiceWorkerRegister />
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
