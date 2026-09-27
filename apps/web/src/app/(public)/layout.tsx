import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import { PublicHtmlLang } from "@/components/public/shared/PublicHtmlLang";
import { JsonLd } from "@/components/common/JsonLd";
import React from "react";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "mqttcloud.ir",
  url: "https://mqttcloud.ir",
  logo: "https://mqttcloud.ir/images/logo/logo-icon.svg",
  description:
    "mqttcloud.ir یک بروکر MQTT امن و مقیاس‌پذیر است. اکانت و دستگاه بسازید، با TLS متصل شوید و پیام‌ها را بی‌درنگ بین دستگاه‌های خود منتشر و دریافت کنید.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="font-vazirmatn min-h-screen bg-white dark:bg-gray-900"
    >
      <PublicHtmlLang />
      <JsonLd data={organizationJsonLd} />
      <PublicNavbar />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
