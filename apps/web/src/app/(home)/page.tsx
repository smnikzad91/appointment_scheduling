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
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";

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
