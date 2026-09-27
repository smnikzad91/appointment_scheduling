import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import { PublicHtmlLang } from "@/components/public/shared/PublicHtmlLang";
import { JsonLd } from "@/components/common/JsonLd";
import React from "react";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo/logo-icon.svg`,
  description: SITE_DESCRIPTION,
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
