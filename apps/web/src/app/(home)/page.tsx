import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import Hero from "@/components/marketing/Hero";
import HowItWorks from "@/components/marketing/HowItWorks";
import Features from "@/components/marketing/Features";
import AndroidApps from "@/components/marketing/AndroidApps";
import Pricing from "@/components/marketing/Pricing";
import Faq from "@/components/marketing/Faq";
import FinalCta from "@/components/marketing/FinalCta";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export const dynamic = "force-dynamic";

const defaultSeo = {
  title: "نوبتا — سامانه نوبت‌دهی آنلاین سالن‌های زیبایی",
  description:
    "نوبتا سامانه نوبت‌دهی آنلاین مخصوص سالن‌های زیبایی است. مشتری‌ها بدون تماس نوبت می‌گیرند و شما با تقویم آنلاین، پیامک یادآوری و بیعانه بانکی مدیریت می‌کنید.",
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = await prisma.siteSeo.findFirst();
  const title = seo?.title || defaultSeo.title;
  const description = seo?.description || defaultSeo.description;

  return {
    title: { absolute: title },
    description,
    keywords: seo?.keywords?.length ? seo.keywords : undefined,
    alternates: { canonical: "https://mqttcloud.ir" },
    openGraph: { title, description, type: "website" },
  };
}

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
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
