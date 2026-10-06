import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import Hero from "@/components/marketing/Hero";
import Showcase from "@/components/marketing/Showcase";
import HowItWorks from "@/components/marketing/HowItWorks";
import Features from "@/components/marketing/Features";
import AndroidApps from "@/components/marketing/AndroidApps";
import Pricing from "@/components/marketing/Pricing";
import Faq from "@/components/marketing/Faq";
import FinalCta from "@/components/marketing/FinalCta";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import { JsonLd } from "@/components/common/JsonLd";

// What the site is, for search engines: the brand (Organization + logo), the site with its salon
// search (WebSite + SearchAction → /salons?q=), and the product (web + Android app).
const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo/logo_symbol_transparent.png`,
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "fa-IR",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/salons?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android",
      inLanguage: "fa-IR",
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export const dynamic = "force-dynamic";

const defaultSeo = { title: SITE_TITLE, description: SITE_DESCRIPTION };

export async function generateMetadata(): Promise<Metadata> {
  const seo = await prisma.siteSeo.findFirst();
  const title = seo?.title || defaultSeo.title;
  const description = seo?.description || defaultSeo.description;

  return {
    title: { absolute: title },
    description,
    keywords: seo?.keywords?.length ? seo.keywords : undefined,
    alternates: { canonical: SITE_URL },
    openGraph: { title, description, type: "website" },
  };
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <MarketingHeader />
      <main>
        <Hero />
        <Showcase />
        <HowItWorks />
        <Features />
        <AndroidApps />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
