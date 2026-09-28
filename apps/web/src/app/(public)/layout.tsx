import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import GuestBackdrop from "@/components/guest/GuestBackdrop";
import { PublicHtmlLang } from "@/components/public/shared/PublicHtmlLang";
import { JsonLd } from "@/components/common/JsonLd";
import React from "react";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import GuestTabBar from "@/components/guest/GuestTabBar";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo/logo-icon.svg`,
  description: SITE_DESCRIPTION,
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // Same guest theme as the landing page. `dark` switches the public components' dark:
    // variants on (mapped to guest tokens); app-root remaps brand-*/gray-* to terracotta/warm.
    <div dir="rtl" className="app-root guest-root dark min-h-screen overflow-x-clip">
      <GuestBackdrop />
      <PublicHtmlLang />
      <JsonLd data={organizationJsonLd} />
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
      <GuestTabBar />
    </div>
  );
}
