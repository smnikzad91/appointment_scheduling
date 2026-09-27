import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import SessionWrapper from "@/components/common/SessionWrapper";
import ToastProvider from "@/components/common/ToastProvider";
import AgGridSetup from "@/components/common/AgGridSetup";

export const metadata: Metadata = {
  metadataBase: new URL("https://mqttcloud.ir"),
  title: {
    default: "mqttcloud.ir — بروکر MQTT ابری برای دستگاه‌های شما",
    template: "%s | mqttcloud.ir",
  },
  description: "mqttcloud.ir یک بروکر MQTT امن و مقیاس‌پذیر است. اکانت و دستگاه بسازید، با TLS متصل شوید و پیام‌ها را بی‌درنگ بین دستگاه‌های خود منتشر و دریافت کنید.",
  keywords: ["بروکر MQTT", "MQTT ابری", "IoT", "اتصال دستگاه", "پیام‌رسانی بی‌درنگ", "pub sub", "MQTT broker", "mqttcloud"],
  authors: [{ name: "mqttcloud.ir", url: "https://mqttcloud.ir" }],
  creator: "mqttcloud.ir",
  publisher: "mqttcloud.ir",
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "mqttcloud.ir",
    locale: "fa_IR",
    type: "website",
    title: "mqttcloud.ir — بروکر MQTT ابری برای دستگاه‌های شما",
    description: "اکانت و دستگاه بسازید، با TLS متصل شوید و پیام‌ها را بی‌درنگ بین دستگاه‌های خود منتشر و دریافت کنید.",
    url: "https://mqttcloud.ir",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "mqttcloud.ir" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mqttcloud_ir",
    creator: "@mqttcloud_ir",
    title: "mqttcloud.ir — بروکر MQTT ابری برای دستگاه‌های شما",
    description: "اکانت و دستگاه بسازید، با TLS متصل شوید و پیام‌ها را بی‌درنگ بین دستگاه‌های خود منتشر و دریافت کنید.",
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
        <link rel="icon" href="/images/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/images/logo/logo-icon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Vazirmatn:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="dark:bg-gray-900">
        <AgGridSetup />
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
